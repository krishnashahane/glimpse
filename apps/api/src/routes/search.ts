import { FastifyPluginAsync } from 'fastify'

export const searchRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const { q, type = 'all', page = 0, limit = 20 } = request.query as {
      q?: string
      type?: string
      page?: number
      limit?: number
    }

    if (!q || q.trim().length < 2) return reply.status(400).send({ error: 'Query too short' })

    const term = q.trim()
    const skip = Number(page) * Number(limit)
    const take = Number(limit)
    const mode = 'insensitive' as const

    const results: Record<string, unknown> = {}

    if (type === 'all' || type === 'posts') {
      results.posts = await fastify.prisma.post.findMany({
        where: {
          parentId: null,
          isHidden: false,
          OR: [
            { content: { contains: term, mode } },
            { linkTitle: { contains: term, mode } },
          ],
        },
        include: {
          author: { select: { id: true, username: true, handle: true, avatar: true, isVerified: true } },
          community: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { score: 'desc' },
        take,
        skip,
      })
    }

    if (type === 'all' || type === 'communities') {
      results.communities = await fastify.prisma.community.findMany({
        where: {
          OR: [
            { name: { contains: term, mode } },
            { description: { contains: term, mode } },
          ],
        },
        select: { id: true, name: true, slug: true, avatar: true, description: true, memberCount: true },
        orderBy: { memberCount: 'desc' },
        take,
        skip,
      })
    }

    if (type === 'all' || type === 'users') {
      results.users = await fastify.prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: term, mode } },
            { handle: { contains: term, mode } },
            { bio: { contains: term, mode } },
          ],
        },
        select: { id: true, username: true, handle: true, avatar: true, bio: true, isVerified: true },
        take,
        skip,
      })
    }

    if (type === 'all' || type === 'news') {
      results.news = await fastify.prisma.newsItem.findMany({
        where: {
          OR: [
            { title: { contains: term, mode } },
            { description: { contains: term, mode } },
          ],
        },
        orderBy: { score: 'desc' },
        take,
        skip,
      })
    }

    return reply.send(results)
  })

  fastify.get('/tags', async (request, reply) => {
    const { q } = request.query as { q?: string }
    const tags = await fastify.prisma.tag.findMany({
      where: q ? { name: { contains: q, mode: 'insensitive' } } : {},
      select: { id: true, name: true, slug: true, _count: { select: { posts: true } } },
      orderBy: { posts: { _count: 'desc' } },
      take: 20,
    })
    return reply.send({ tags })
  })
}
