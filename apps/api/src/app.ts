import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import cookie from '@fastify/cookie'
import { config } from './config'
import prismaPlugin from './plugins/prisma'
import redisPlugin from './plugins/redis'
import { authenticate, optionalAuthenticate } from './middleware/authenticate'
import { authRoutes } from './routes/auth'
import { postRoutes } from './routes/posts'
import { feedRoutes } from './routes/feed'
import { communityRoutes } from './routes/communities'
import { userRoutes } from './routes/users'
import { newsRoutes } from './routes/news'
import { searchRoutes } from './routes/search'
import { notificationRoutes } from './routes/notifications'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      ...(config.NODE_ENV === 'development' && {
        transport: { target: 'pino-pretty', options: { colorize: true } },
      }),
    },
  })

  await app.register(cors, {
    origin: config.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  })

  await app.register(helmet, { contentSecurityPolicy: false })

  await app.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({ error: 'Too many requests. Slow down.' }),
  })

  await app.register(jwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: '15m' },
  })

  await app.register(cookie)

  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  })

  await app.register(redisPlugin)
  await app.register(prismaPlugin)

  app.decorate('authenticate', authenticate)
  app.decorate('optionalAuthenticate', optionalAuthenticate)

  // Routes
  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(feedRoutes, { prefix: '/api/feed' })
  await app.register(postRoutes, { prefix: '/api/posts' })
  await app.register(communityRoutes, { prefix: '/api/communities' })
  await app.register(userRoutes, { prefix: '/api/users' })
  await app.register(newsRoutes, { prefix: '/api/news' })
  await app.register(searchRoutes, { prefix: '/api/search' })
  await app.register(notificationRoutes, { prefix: '/api/notifications' })

  app.get('/health', async () => ({ status: 'ok', ts: Date.now() }))

  return app
}
