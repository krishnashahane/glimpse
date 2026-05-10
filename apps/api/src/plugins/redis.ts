import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { redis } from '../lib/redis'

const redisPlugin: FastifyPluginAsync = async (fastify) => {
  await redis.connect()
  fastify.decorate('redis', redis)
  fastify.addHook('onClose', async () => {
    await redis.quit()
  })
}

export default fp(redisPlugin, { name: 'redis' })
