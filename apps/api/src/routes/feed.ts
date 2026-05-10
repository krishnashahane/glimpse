import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { rankScore } from '../services/ranking.service'

const POST_SELECT = {
  id: true,
  content: true,
  type: true,
  mediaUrls: true,
  linkUrl: true,
  linkTitle: true,
  linkImage: true,
  score: true,
  upvotes: true,
  downvotes: true,
  commentCount: true,
  views: true,
  isPinned: true,
  isNsfw: true,
  createdAt: true,
  author: {
    select: { id: true, username: true, handle: true, avatar: true, isVerified: true },
  },
  community: {
    select: { id: true, name: true, slug: true, avatar: true },
  },
  tags: { include: { tag: { select: { name: true, slug: true } } } },
}

const FeedQuerySchema = z.object({
  type: z.enum(['for_you', 'latest', 'following', 'trending']).default('for_you'),
  page: z.coerce.number().min(0).default(0),
  limit: z.coerce.number().min(1).max(50).default(20),
})

export const feedRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { onRequest: [fastify.optionalAuthenticate] }, async (request, reply) => {
    const result = FeedQuerySchema.safeParse(request.query)
    if (!result.success) return reply.status(400).send({ error: result.error.flatten() })

    const { type, page, limit } = result.data
    const userId = request.user?.sub
    const skip = page * limit

    let whereClause: Record<string, unknown> = { parentId: null, isHidden: false }

    if (type === 'following' && userId) {
      const follows = await fastify.prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      })
      const memberships = await fastify.prisma.communityMember.findMany({
        where: { userId },
        select: { communityId: true },
      })
      whereClause = {
        ...whereClause,
        OR: [
          { authorId: { in: follows.map((f) => f.followingId) } },
          { communityId: { in: memberships.map((m) => m.communityId) } },
        ],
      }
    } else if (type === 'trending') {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      whereClause = { ...whereClause, createdAt: { gte: oneDayAgo } }
    } else if (type === 'latest') {
      // no extra filter
    }

    const posts = await fastify.prisma.post.findMany({
      where: whereClause,
      select: POST_SELECT,
      orderBy: type === 'latest'
        ? [{ createdAt: 'desc' }]
        : [{ score: 'desc' }, { createdAt: 'desc' }],
      take: limit + 1,
      skip,
    })

    const hasMore = posts.length > limit
    const items = hasMore ? posts.slice(0, -1) : posts

    // attach user's vote if authenticated
    let userVotes: Record<string, number> = {}
    if (userId && items.length > 0) {
      const votes = await fastify.prisma.vote.findMany({
        where: { userId, postId: { in: items.map((p) => p.id) } },
        select: { postId: true, value: true },
      })
      userVotes = Object.fromEntries(votes.map((v) => [v.postId, v.value]))
    }

    const enriched = items.map((p) => ({
      ...p,
      tags: p.tags.map((pt) => pt.tag),
      userVote: userVotes[p.id] ?? 0,
      computedScore: rankScore(p.upvotes, p.downvotes, p.createdAt, p.commentCount),
    }))

    return reply.send({ posts: enriched, hasMore, nextPage: hasMore ? page + 1 : null })
  })
}
