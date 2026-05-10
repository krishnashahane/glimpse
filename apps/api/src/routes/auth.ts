import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { hashPassword, verifyPassword, createSession, rotateSession, safeUser } from '../services/auth.service'

const RegisterSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  handle: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(72),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60,
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/register', async (request, reply) => {
    const result = RegisterSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ error: result.error.flatten() })

    const { username, handle, email, password } = result.data

    const existing = await fastify.prisma.user.findFirst({
      where: { OR: [{ email }, { handle }, { username }] },
    })
    if (existing) return reply.status(409).send({ error: 'Email, username, or handle already taken' })

    const passwordHash = await hashPassword(password)
    const user = await fastify.prisma.user.create({
      data: { username, handle, email, passwordHash },
    })

    const session = await createSession(
      fastify.prisma,
      user.id,
      request.headers['user-agent'],
      request.ip,
    )

    const token = fastify.jwt.sign({ sub: user.id, handle: user.handle, email: user.email, role: user.role })

    reply.setCookie('refresh_token', session.refreshToken, COOKIE_OPTS)
    return reply.status(201).send({ user: safeUser(user), token })
  })

  fastify.post('/login', async (request, reply) => {
    const result = LoginSchema.safeParse(request.body)
    if (!result.success) return reply.status(400).send({ error: result.error.flatten() })

    const { email, password } = result.data
    const user = await fastify.prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) return reply.status(401).send({ error: 'Invalid credentials' })

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) return reply.status(401).send({ error: 'Invalid credentials' })

    await fastify.prisma.user.update({ where: { id: user.id }, data: { isOnline: true, lastSeen: new Date() } })

    const session = await createSession(
      fastify.prisma,
      user.id,
      request.headers['user-agent'],
      request.ip,
    )

    const token = fastify.jwt.sign({ sub: user.id, handle: user.handle, email: user.email, role: user.role })

    reply.setCookie('refresh_token', session.refreshToken, COOKIE_OPTS)
    return reply.send({ user: safeUser(user), token })
  })

  fastify.post('/refresh', async (request, reply) => {
    const refreshToken = (request.cookies as Record<string, string>)?.refresh_token
    if (!refreshToken) return reply.status(401).send({ error: 'No refresh token' })

    const result = await rotateSession(
      fastify.prisma,
      refreshToken,
      request.headers['user-agent'],
      request.ip,
    )
    if (!result) return reply.status(401).send({ error: 'Invalid or expired session' })

    const user = await fastify.prisma.user.findUnique({ where: { id: result.userId } })
    if (!user) return reply.status(401).send({ error: 'User not found' })

    const token = fastify.jwt.sign({ sub: user.id, handle: user.handle, email: user.email, role: user.role })

    reply.setCookie('refresh_token', result.session.refreshToken, COOKIE_OPTS)
    return reply.send({ user: safeUser(user), token })
  })

  fastify.post('/logout', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const refreshToken = (request.cookies as Record<string, string>)?.refresh_token
    if (refreshToken) {
      await fastify.prisma.session.deleteMany({ where: { refreshToken } }).catch(() => {})
    }
    await fastify.prisma.user.update({
      where: { id: request.user.sub },
      data: { isOnline: false, lastSeen: new Date() },
    })
    reply.clearCookie('refresh_token', { path: '/' })
    return reply.send({ success: true })
  })

  fastify.get('/me', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.sub },
      include: {
        _count: { select: { followers: true, following: true, posts: true } },
      },
    })
    if (!user) return reply.status(404).send({ error: 'User not found' })
    return reply.send({ user: { ...safeUser(user), _count: user._count } })
  })
}
