import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { rankScore } from '../services/ranking.service'

const CreatePostSchema = z.object({
  content: z.string().min(1).max(40000),
  type: z.enum(['TEXT', 'LINK', 'IMAGE', 'VIDEO', 'POLL']).default('TEXT'),
  communityId: z.string().optional(),
  parentId: z.string().optional(),
  mediaUrls: z.array(z.string().url()).max(4).optional(),
  linkUrl: z.string().url().optional(),
  linkTitle: z.string().max(300).optional(),
  tags: z.array(z.string().min(1).max(30)).max(5).optional(),
})

const VoteSchema = z.object({ value: z.union([z.literal(1), z.literal(-1)]) })

const POST_INCLUDE = {
  author: { select: { id: true, username: true, handle: true, avatar: true, isVerified: true } },
  community: { select: { id: true, name: true, slug: true, avatar: true } },
  tags: { include: { tag: { select: { name: true, slug: true } } } },
  _count: { select: { replies: true } },
}

export const postRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/:id', { onRequest: [fastify.optionalAuthenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const post = await fastify.prisma.post.findUnique({ where: { id }, include: POST_INCLUDE })
    if (!post || post.isHidden) return reply.status(404).send({ error: 'Not found' })

    await fastify.prisma.post.update({ where: { id }, data: { views: { increment: 1 } } })

    let userVote = 0
    if (request.user?.sub) {
      const v = await fastify.prisma.vote.findUnique({ where: { userId_postId: { userId: request.user.sub, postId: id } } })
      userVote = v?.value ?? 0
    }

    return reply.send({ post: { ...post, tags: post.tags.map((pt) => pt.tag), userVote } })
  })

  fastify.post('/', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const result = CreatePostSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ error: result.error.flatten() })

    const { content, type, communityId, parentId, mediaUrls, linkUrl, linkTitle, tags } = result.data

    if (communityId) {
      const community = await fastify.prisma.community.findUnique({ where: { id: communityId } })
      if (!community) return reply.status(404).send({ error: 'Community not found' })
      if (community.type !== 'PUBLIC') {
        const member = await fastify.prisma.communityMember.findUnique({
          where: { userId_communityId: { userId: request.user.sub, communityId } },
        })
        if (!member) return reply.status(403).send({ error: 'Not a member' })
      }
    }

    if (parentId) {
      const parent = await fastify.prisma.post.findUnique({ where: { id: parentId } })
      if (!parent) return reply.status(404).send({ error: 'Parent post not found' })
    }

    const post = await fastify.prisma.$transaction(async (tx) => {
      const created = await tx.post.create({
        data: {
          content,
          type,
          authorId: request.user.sub,
          communityId: communityId || null,
          parentId: parentId || null,
          mediaUrls: mediaUrls || [],
          linkUrl: linkUrl || null,
          linkTitle: linkTitle || null,
        },
        include: POST_INCLUDE,
      })

      if (tags && tags.length > 0) {
        for (const tagName of tags) {
          const slug = tagName.toLowerCase().replace(/\s+/g, '-')
          const tag = await tx.tag.upsert({
            where: { slug },
            create: { name: tagName, slug },
            update: {},
          })
          await tx.postTag.create({ data: { postId: created.id, tagId: tag.id } })
        }
      }

      if (parentId) {
        await tx.post.update({ where: { id: parentId }, data: { commentCount: { increment: 1 } } })
      }

      if (communityId) {
        await tx.community.update({ where: { id: communityId }, data: { postCount: { increment: 1 } } })
      }

      return created
    })

    // notify parent author
    if (parentId) {
      const parent = await fastify.prisma.post.findUnique({ where: { id: parentId }, select: { authorId: true } })
      if (parent && parent.authorId !== request.user.sub) {
        await fastify.prisma.notification.create({
          data: {
            type: 'COMMENT',
            userId: parent.authorId,
            actorId: request.user.sub,
            data: { postId: parentId, commentId: post.id, content: content.slice(0, 100) },
          },
        })
        fastify.io.to(`user:${parent.authorId}`).emit('notification:new')
      }
    }

    fastify.io.to(parentId ? `post:${parentId}` : 'feed').emit('post:new', { postId: post.id })

    return reply.status(201).send({ post: { ...post, tags: post.tags.map((pt) => pt.tag), userVote: 0 } })
  })

  fastify.delete('/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const post = await fastify.prisma.post.findUnique({ where: { id } })
    if (!post) return reply.status(404).send({ error: 'Not found' })
    if (post.authorId !== request.user.sub && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Forbidden' })
    }
    await fastify.prisma.post.update({ where: { id }, data: { isHidden: true } })
    return reply.send({ success: true })
  })

  fastify.post('/:id/vote', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = VoteSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ error: result.error.flatten() })

    const post = await fastify.prisma.post.findUnique({ where: { id } })
    if (!post) return reply.status(404).send({ error: 'Not found' })

    const { value } = result.data
    const userId = request.user.sub

    const updated = await fastify.prisma.$transaction(async (tx) => {
      const existing = await tx.vote.findUnique({ where: { userId_postId: { userId, postId: id } } })

      let deltaUp = 0
      let deltaDown = 0

      if (existing) {
        if (existing.value === value) {
          // toggle off
          await tx.vote.delete({ where: { userId_postId: { userId, postId: id } } })
          if (value === 1) deltaUp = -1
          else deltaDown = -1
        } else {
          await tx.vote.update({ where: { userId_postId: { userId, postId: id } }, data: { value } })
          if (value === 1) { deltaUp = 1; deltaDown = -1 }
          else { deltaUp = -1; deltaDown = 1 }
        }
      } else {
        await tx.vote.create({ data: { userId, postId: id, value } })
        if (value === 1) deltaUp = 1
        else deltaDown = 1
      }

      const p = await tx.post.update({
        where: { id },
        data: {
          upvotes: { increment: deltaUp },
          downvotes: { increment: deltaDown },
        },
      })

      const newScore = rankScore(p.upvotes, p.downvotes, p.createdAt, p.commentCount)
      await tx.post.update({ where: { id }, data: { score: Math.round(newScore * 1000) } })

      return p
    })

    // notify post author
    if (value === 1 && post.authorId !== userId) {
      await fastify.prisma.notification.create({
        data: {
          type: 'VOTE',
          userId: post.authorId,
          actorId: userId,
          data: { postId: id },
        },
      }).catch(() => {})
      fastify.io.to(`user:${post.authorId}`).emit('notification:new')
    }

    const userVote = await fastify.prisma.vote.findUnique({ where: { userId_postId: { userId, postId: id } } })
    return reply.send({ upvotes: updated.upvotes, downvotes: updated.downvotes, userVote: userVote?.value ?? 0 })
  })

  fastify.get('/:id/comments', { onRequest: [fastify.optionalAuthenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { page = 0, limit = 50 } = request.query as { page?: number; limit?: number }

    const comments = await fastify.prisma.post.findMany({
      where: { parentId: id, isHidden: false },
      include: {
        author: { select: { id: true, username: true, handle: true, avatar: true, isVerified: true } },
        _count: { select: { replies: true } },
      },
      orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
      take: Number(limit) + 1,
      skip: Number(page) * Number(limit),
    })

    const hasMore = comments.length > Number(limit)
    const items = hasMore ? comments.slice(0, -1) : comments

    let userVotes: Record<string, number> = {}
    if (request.user?.sub) {
      const votes = await fastify.prisma.vote.findMany({
        where: { userId: request.user.sub, postId: { in: items.map((c) => c.id) } },
        select: { postId: true, value: true },
      })
      userVotes = Object.fromEntries(votes.map((v) => [v.postId, v.value]))
    }

    return reply.send({
      comments: items.map((c) => ({ ...c, userVote: userVotes[c.id] ?? 0 })),
      hasMore,
    })
  })
}
