import { ExternalLink, Clock, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatDistanceToNow } from 'date-fns'

interface NewsItem {
  id: string
  title: string
  url: string
  source: string
  author?: string | null
  description?: string | null
  aiSummary?: string | null
  imageUrl?: string | null
  tags: string[]
  score: number
  views: number
  publishedAt: string
}

export function NewsCard({ item, compact }: { item: NewsItem; compact?: boolean }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card flex gap-3 p-4 hover:border-border-bright transition-all duration-200 group block"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="accent">{item.source}</Badge>
          {item.tags.slice(0, 2).map((t) => (
            <Badge key={t} variant="muted">{t}</Badge>
          ))}
        </div>

        <h3 className="text-sm font-semibold text-text-1 leading-snug mb-1.5 group-hover:text-accent transition-colors line-clamp-2">
          {item.title}
        </h3>

        {!compact && item.aiSummary && (
          <div className="flex gap-1.5 mb-2 p-2 rounded-lg bg-accent-dim">
            <Sparkles className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
            <p className="text-xs text-text-2 leading-relaxed">{item.aiSummary}</p>
          </div>
        )}

        {!compact && !item.aiSummary && item.description && (
          <p className="text-xs text-text-3 line-clamp-2 mb-1.5">{item.description}</p>
        )}

        <div className="flex items-center gap-2 text-xs text-text-3">
          <Clock className="w-3 h-3" />
          <span>{formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })}</span>
          {item.author && <><span>·</span><span>{item.author}</span></>}
          <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {item.imageUrl && !compact && (
        <img
          src={item.imageUrl}
          alt=""
          className="w-24 h-20 object-cover rounded-lg flex-shrink-0"
        />
      )}
    </a>
  )
}
