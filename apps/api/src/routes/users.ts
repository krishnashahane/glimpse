import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { safeUser } from '../services/auth.service'

const UpdateProfileSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional().or(z.literal('')),
  location: z.string().max(100).optional(),
  avatar: z.string().url().optional(),
  banner: z.string().url().optional(),
})

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/:handle', { onRequest: [fastify.optionalAuthenticate] }, async (request, reply) => {
    const { handle } = request.params as { handle: string }
    const user = await fastify.prisma.user.findUnique({
      where: { handle },
      include: { _count: { select: { followers: true, following: true, posts: true } } },
    })
    if (!user) return reply.status(404).send({ error: 'User not found' })

    let isFollowing = false
    if (request.user?.sub && request.user.sub !== user.id) {
      const f = await fastify.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: request.user.sub, followingId: user.id } },
      })
      isFollowing = !!f
    }

    return reply.send({ user: { ...safeUser(user), _count: user._count }, isFollowing })
  })

  fastify.put('/me', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const result = UpdateProfileSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ error: result.error.flatten() })

    const data = result.data
    if (data.username) {
      const existing = await fastify.prisma.user.findFirst({
        where: { username: data.username, NOT: { id: request.user.sub } },
      })
      if (existing) return reply.status(409).send({ error: 'Username taken' })
    }

    const user = await fastify.prisma.user.update({
      where: { id: request.user.sub },
      data,
    })
    return reply.send({ user: safeUser(user) })
  })

  fastify.post('/:handle/follow', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { handle } = request.params as { handle: string }
    const target = await fastify.prisma.user.findUnique({ where: { handle }, select: { id: true } })
    if (!target) return reply.status(404).send({ error: 'User not found' })
    if (target.id === request.user.sub) return reply.status(400).send({ error: 'Cannot follow yourself' })

    await fastify.prisma.follow.upsert({
      where: { followerId_followingId: { followerId: request.user.sub, followingId: target.id } },
      create: { followerId: request.user.sub, followingId: target.id },
      update: {},
    })

    await fastify.prisma.notification.create({
      data: {
        type: 'FOLLOW',
        userId: target.id,
        actorId: request.user.sub,
        data: { followerId: request.user.sub },
      },
    }).catch(() => {})
    fastify.io.to(`user:${target.id}`).emit('notification:new')

    return reply.send({ success: true })
  })

  fastify.delete('/:handle/follow', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { handle } = request.params as { handle: string }
    const target = await fastify.prisma.user.findUnique({ where: { handle }, select: { id: true } })
    if (!target) return reply.status(404).send({ error: 'User not found' })

    await fastify.prisma.follow.deleteMany({
      where: { followerId: request.user.sub, followingId: target.id },
    })
    return reply.send({ success: true })
  })

  fastify.get('/:handle/posts', { onRequest: [fastify.optionalAuthenticate] }, async (request, reply) => {
    const { handle } = request.params as { handle: string }
    const { page = 0, limit = 20 } = request.query as { page?: number; limit?: number }

    const user = await fastify.prisma.user.findUnique({ where: { handle }, select: { id: true } })
    if (!user) return reply.status(404).send({ error: 'Not found' })

    const posts = await fastify.prisma.post.findMany({
      where: { authorId: user.id, parentId: null, isHidden: false },
      include: {
        community: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: { select: { name: true, slug: true } } } },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit) + 1,
      skip: Number(page) * Number(limit),
    })

    const hasMore = posts.length > Number(limit)
    const items = hasMore ? posts.slice(0, -1) : posts

    return reply.send({
      posts: items.map((p) => ({ ...p, tags: p.tags.map((pt) => pt.tag) })),
      hasMore,
    })
  })

  fastify.get('/:handle/followers', async (request, reply) => {
    const { handle } = request.params as { handle: string }
    const { page = 0, limit = 20 } = request.query as { page?: number; limit?: number }

    const user = await fastify.prisma.user.findUnique({ where: { handle }, select: { id: true } })
    if (!user) return reply.status(404).send({ error: 'Not found' })

    const follows = await fastify.prisma.follow.findMany({
      where: { followingId: user.id },
      include: { follower: { select: { id: true, username: true, handle: true, avatar: true, isVerified: true, bio: true } } },
      take: Number(limit),
      skip: Number(page) * Number(limit),
      orderBy: { createdAt: 'desc' },
    })

    return reply.send({ followers: follows.map((f) => f.follower) })
  })

  fastify.get('/:handle/following', async (request, reply) => {
    const { handle } = request.params as { handle: string }
    const { page = 0, limit = 20 } = request.query as { page?: number; limit?: number }

    const user = await fastify.prisma.user.findUnique({ where: { handle }, select: { id: true } })
    if (!user) return reply.status(404).send({ error: 'Not found' })

    const follows = await fastify.prisma.follow.findMany({
      where: { followerId: user.id },
      include: { following: { select: { id: true, username: true, handle: true, avatar: true, isVerified: true, bio: true } } },
      take: Number(limit),
      skip: Number(page) * Number(limit),
      orderBy: { createdAt: 'desc' },
    })

    return reply.send({ following: follows.map((f) => f.following) })
  })
}
