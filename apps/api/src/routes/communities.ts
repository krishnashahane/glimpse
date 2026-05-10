import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const CreateCommunitySchema = z.object({
  name: z.string().min(3).max(50),
  slug: z.string().min(3).max(30).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  type: z.enum(['PUBLIC', 'RESTRICTED', 'PRIVATE']).default('PUBLIC'),
  rules: z.array(z.string().max(200)).max(10).optional(),
  tags: z.array(z.string().max(30)).max(5).optional(),
})

const COMMUNITY_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  avatar: true,
  banner: true,
  type: true,
  memberCount: true,
  postCount: true,
  rules: true,
  tags: true,
  createdAt: true,
}

export const communityRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { onRequest: [fastify.optionalAuthenticate] }, async (request, reply) => {
    const { page = 0, limit = 20, q } = request.query as { page?: number; limit?: number; q?: string }

    const where = q ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { description: { contains: q, mode: 'insensitive' as const } }] } : {}

    const [communities, total] = await Promise.all([
      fastify.prisma.community.findMany({
        where,
        select: COMMUNITY_SELECT,
        orderBy: { memberCount: 'desc' },
        take: Number(limit),
        skip: Number(page) * Number(limit),
      }),
      fastify.prisma.community.count({ where }),
    ])

    let memberOf = new Set<string>()
    if (request.user?.sub) {
      const memberships = await fastify.prisma.communityMember.findMany({
        where: { userId: request.user.sub, communityId: { in: communities.map((c) => c.id) } },
        select: { communityId: true },
      })
      memberOf = new Set(memberships.map((m) => m.communityId))
    }

    return reply.send({
      communities: communities.map((c) => ({ ...c, isMember: memberOf.has(c.id) })),
      total,
    })
  })

  fastify.get('/:slug', { onRequest: [fastify.optionalAuthenticate] }, async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const community = await fastify.prisma.community.findUnique({ where: { slug }, select: COMMUNITY_SELECT })
    if (!community) return reply.status(404).send({ error: 'Community not found' })

    let isMember = false
    let memberRole: string | null = null
    if (request.user?.sub) {
      const m = await fastify.prisma.communityMember.findUnique({
        where: { userId_communityId: { userId: request.user.sub, communityId: community.id } },
      })
      isMember = !!m
      memberRole = m?.role ?? null
    }

    return reply.send({ community, isMember, memberRole })
  })

  fastify.post('/', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const result = CreateCommunitySchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ error: result.error.flatten() })

    const existing = await fastify.prisma.community.findUnique({ where: { slug: result.data.slug } })
    if (existing) return reply.status(409).send({ error: 'Slug already taken' })

    const community = await fastify.prisma.$transaction(async (tx) => {
      const c = await tx.community.create({
        data: {
          name: result.data.name,
          slug: result.data.slug,
          description: result.data.description,
          type: result.data.type,
          rules: result.data.rules || [],
          tags: result.data.tags || [],
        },
      })
      await tx.communityMember.create({
        data: { userId: request.user.sub, communityId: c.id, role: 'MODERATOR' },
      })
      await tx.community.update({ where: { id: c.id }, data: { memberCount: 1 } })
      return c
    })

    return reply.status(201).send({ community })
  })

  fastify.post('/:slug/join', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const community = await fastify.prisma.community.findUnique({ where: { slug } })
    if (!community) return reply.status(404).send({ error: 'Not found' })
    if (community.type === 'PRIVATE') return reply.status(403).send({ error: 'Private community' })

    const existing = await fastify.prisma.communityMember.findUnique({
      where: { userId_communityId: { userId: request.user.sub, communityId: community.id } },
    })
    if (existing) return reply.status(409).send({ error: 'Already a member' })

    await fastify.prisma.$transaction([
      fastify.prisma.communityMember.create({ data: { userId: request.user.sub, communityId: community.id } }),
      fastify.prisma.community.update({ where: { id: community.id }, data: { memberCount: { increment: 1 } } }),
    ])

    return reply.send({ success: true })
  })

  fastify.delete('/:slug/leave', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const community = await fastify.prisma.community.findUnique({ where: { slug } })
    if (!community) return reply.status(404).send({ error: 'Not found' })

    await fastify.prisma.$transaction([
      fastify.prisma.communityMember.delete({
        where: { userId_communityId: { userId: request.user.sub, communityId: community.id } },
      }),
      fastify.prisma.community.update({ where: { id: community.id }, data: { memberCount: { decrement: 1 } } }),
    ])

    return reply.send({ success: true })
  })

  fastify.get('/:slug/posts', { onRequest: [fastify.optionalAuthenticate] }, async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const { page = 0, limit = 20, sort = 'hot' } = request.query as { page?: number; limit?: number; sort?: string }

    const community = await fastify.prisma.community.findUnique({ where: { slug }, select: { id: true } })
    if (!community) return reply.status(404).send({ error: 'Not found' })

    const posts = await fastify.prisma.post.findMany({
      where: { communityId: community.id, parentId: null, isHidden: false },
      include: {
        author: { select: { id: true, username: true, handle: true, avatar: true, isVerified: true } },
        tags: { include: { tag: { select: { name: true, slug: true } } } },
      },
      orderBy: sort === 'new' ? [{ createdAt: 'desc' }] : [{ score: 'desc' }, { createdAt: 'desc' }],
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
}
