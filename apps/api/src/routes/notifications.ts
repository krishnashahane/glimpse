import { FastifyPluginAsync } from 'fastify'
import { paginationSchema } from '../lib/pagination'

export const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const parsedQuery = paginationSchema.safeParse(request.query)
    if (!parsedQuery.success) return reply.status(400).send({ error: parsedQuery.error.flatten() })
    const { page, limit } = parsedQuery.data

    const [notifications, unreadCount] = await Promise.all([
      fastify.prisma.notification.findMany({
        where: { userId: request.user.sub },
        include: {
          user: { select: { id: true, username: true, handle: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        skip: page * limit,
      }),
      fastify.prisma.notification.count({ where: { userId: request.user.sub, read: false } }),
    ])

    // enrich with actor info
    const actorIds = [...new Set(notifications.filter((n) => n.actorId).map((n) => n.actorId!))]
    const actors =
      actorIds.length > 0
        ? await fastify.prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, username: true, handle: true, avatar: true, isVerified: true },
          })
        : []
    const actorMap = Object.fromEntries(actors.map((a) => [a.id, a]))

    const hasMore = notifications.length > limit
    const items = hasMore ? notifications.slice(0, -1) : notifications

    return reply.send({
      notifications: items.map((n) => ({
        ...n,
        actor: n.actorId ? actorMap[n.actorId] : null,
      })),
      hasMore,
      unreadCount,
    })
  })

  fastify.post('/read', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { ids } = request.body as { ids?: string[] }

    if (ids && ids.length > 0) {
      await fastify.prisma.notification.updateMany({
        where: { id: { in: ids }, userId: request.user.sub },
        data: { read: true },
      })
    } else {
      await fastify.prisma.notification.updateMany({
        where: { userId: request.user.sub, read: false },
        data: { read: true },
      })
    }

    return reply.send({ success: true })
  })

  fastify.get('/unread-count', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const count = await fastify.prisma.notification.count({
      where: { userId: request.user.sub, read: false },
    })
    return reply.send({ count })
  })
}
