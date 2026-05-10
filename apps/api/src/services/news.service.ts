import Parser from 'rss-parser'
import { PrismaClient } from '@prisma/client'
import Anthropic from '@anthropic-ai/sdk'
import { config } from '../config'

const parser = new Parser()

const RSS_FEEDS = [
  { url: 'https://techcrunch.com/feed/', source: 'TechCrunch', tags: ['tech', 'startup'] },
  { url: 'https://www.theverge.com/rss/index.xml', source: 'The Verge', tags: ['tech', 'science'] },
  { url: 'https://hnrss.org/frontpage', source: 'Hacker News', tags: ['tech', 'programming'] },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', source: 'Ars Technica', tags: ['tech', 'science'] },
  { url: 'https://www.wired.com/feed/rss', source: 'Wired', tags: ['tech', 'culture'] },
]

const anthropic = config.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })
  : null

async function summarizeArticle(title: string, description: string): Promise<string | null> {
  if (!anthropic) return null
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `Summarize this news article in 2 sentences max. Be concise and factual.\n\nTitle: ${title}\n\nDescription: ${description}`,
        },
      ],
    })
    const block = msg.content[0]
    return block.type === 'text' ? block.text : null
  } catch {
    return null
  }
}

export async function fetchAndStoreNews(prisma: PrismaClient): Promise<void> {
  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url)
      for (const item of parsed.items.slice(0, 10)) {
        if (!item.link || !item.title) continue
        const existing = await prisma.newsItem.findUnique({ where: { url: item.link } })
        if (existing) continue

        const aiSummary = await summarizeArticle(
          item.title,
          item.contentSnippet || item.summary || '',
        )

        await prisma.newsItem.create({
          data: {
            title: item.title,
            url: item.link,
            source: feed.source,
            author: item.creator || item.author || null,
            description: item.contentSnippet || item.summary || null,
            aiSummary,
            imageUrl: (item as Record<string, unknown>).enclosure
              ? ((item as Record<string, unknown>).enclosure as { url?: string }).url || null
              : null,
            tags: feed.tags,
            publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          },
        })
      }
    } catch (err) {
      console.error(`Failed to fetch feed ${feed.source}:`, err)
    }
  }
}
