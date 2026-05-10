import Redis from 'ioredis'
import { config } from '../config'

export const redis = config.REDIS_URL
  ? new Redis(config.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: true })
  : null

if (redis) {
  redis.on('error', (err) => console.error('Redis error:', err))
}
