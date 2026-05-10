import 'dotenv/config'
import { Server as SocketServer } from 'socket.io'
import cron from 'node-cron'
import { buildApp } from './app'
import { config } from './config'
import { setupSocket } from './lib/socket'
import { fetchAndStoreNews } from './services/news.service'

async function main() {
  const app = await buildApp()

  await app.listen({ port: config.PORT, host: '0.0.0.0' })

  const io = new SocketServer(app.server, {
    cors: { origin: config.CORS_ORIGINS, credentials: true },
    transports: ['websocket', 'polling'],
  })

  app.decorate('io', io)
  setupSocket(io, app)

  // fetch news every hour
  cron.schedule('0 * * * *', async () => {
    app.log.info('Fetching news...')
    await fetchAndStoreNews(app.prisma)
  })

  // initial news fetch
  if (config.NODE_ENV !== 'test') {
    fetchAndStoreNews(app.prisma).catch((e) => app.log.error(e, 'News fetch failed'))
  }

  app.log.info(`Glimpse API running on port ${config.PORT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
