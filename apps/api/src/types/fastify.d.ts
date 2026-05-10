import { PrismaClient } from '@prisma/client'
import { Redis } from 'ioredis'
import { Server as SocketServer } from 'socket.io'
import { FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
    redis?: Redis
    io?: SocketServer
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    optionalAuthenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string
      handle: string
      email: string
      role: string
    }
    user: {
      sub: string
      handle: string
      email: string
      role: string
    }
  }
}
