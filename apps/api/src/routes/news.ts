import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { paginationSchema } from '../lib/pagination'

export const newsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const parsedQuery = paginationSchema.extend({ tag: z.string().max(50).optional() }).safeParse(request.query)
    if (!parsedQuery.success) return reply.status(400).send({ error: parsedQuery.error.flatten() })
    const { page, limit, tag } = parsedQuery.data

    const where = tag ? { tags: { has: tag } } : {}

    const [news, total] = await Promise.all([
      fastify.prisma.newsItem.findMany({
        where,
        orderBy: [{ score: 'desc' }, { publishedAt: 'desc' }],
        take: limit + 1,
        skip: page * limit,
      }),
      fastify.prisma.newsItem.count({ where }),
    ])

    const hasMore = news.length > limit
    return reply.send({ news: hasMore ? news.slice(0, -1) : news, hasMore, total })
  })

  fastify.get('/trending', async (_request, reply) => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const news = await fastify.prisma.newsItem.findMany({
      where: { publishedAt: { gte: oneDayAgo } },
      orderBy: [{ score: 'desc' }, { views: 'desc' }],
      take: 10,
    })
    return reply.send({ news })
  })

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const item = await fastify.prisma.newsItem.findUnique({ where: { id } })
    if (!item) return reply.status(404).send({ error: 'Not found' })
    await fastify.prisma.newsItem.update({ where: { id }, data: { views: { increment: 1 } } })
    return reply.send({ item })
  })
}
