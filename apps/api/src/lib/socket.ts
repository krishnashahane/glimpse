import { Server as SocketServer } from 'socket.io'
import { FastifyInstance } from 'fastify'

export function setupSocket(io: SocketServer, fastify: FastifyInstance) {
  io.on('connection', async (socket) => {
    const token = socket.handshake.auth?.token as string | undefined

    if (token) {
      try {
        const decoded = fastify.jwt.verify<{ sub: string }>(token)
        const userId = decoded.sub
        socket.join(`user:${userId}`)

        await fastify.prisma.user.update({
          where: { id: userId },
          data: { isOnline: true, lastSeen: new Date() },
        }).catch(() => {})

        socket.on('disconnect', async () => {
          await fastify.prisma.user.update({
            where: { id: userId },
            data: { isOnline: false, lastSeen: new Date() },
          }).catch(() => {})
        })

        socket.on('join:post', (postId: string) => {
          socket.join(`post:${postId}`)
        })

        socket.on('leave:post', (postId: string) => {
          socket.leave(`post:${postId}`)
        })
      } catch {
        // unauthenticated socket — allow read-only events
      }
    }

    socket.on('join:community', (slug: string) => {
      socket.join(`community:${slug}`)
    })
  })
}
