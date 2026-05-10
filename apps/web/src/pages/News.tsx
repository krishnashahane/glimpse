import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { NewsCard } from '@/components/news/NewsCard'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { newsApi } from '@/lib/api'

const TAGS = ['tech', 'science', 'startup', 'programming', 'culture', 'finance']

type NewsItem = Parameters<typeof NewsCard>[0]['item']

export default function News() {
  const [activeTag, setActiveTag] = useState<string | undefined>()
  const [page, setPage] = useState(0)
  const [allNews, setAllNews] = useState<NewsItem[]>([])
  const [hasMore, setHasMore] = useState(true)

  const { isLoading, isFetching } = useQuery({
    queryKey: ['news', activeTag, page],
    queryFn: async () => {
      const { data } = await newsApi.list(page, activeTag)
      if (page === 0) setAllNews(data.news)
      else setAllNews((prev) => [...prev, ...data.news])
      setHasMore(data.hasMore)
      return data
    },
    staleTime: 5 * 60 * 1000,
  })

  const loadMore = useCallback(() => {
    if (!isFetching && hasMore) setPage((p) => p + 1)
  }, [isFetching, hasMore])

  const sentinelRef = useInfiniteScroll(loadMore, hasMore, isFetching)

  const switchTag = (tag?: string) => {
    setActiveTag(tag)
    setPage(0)
    setAllNews([])
    setHasMore(true)
  }

  return (
    <div>
      <div className="sticky top-0 z-10 bg-base/80 backdrop-blur-md border-b border-border-dim px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-accent" />
          <h1 className="text-base font-semibold text-text-1">News</h1>
          <span className="text-xs text-text-3 ml-1">AI-curated</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={!activeTag ? 'accent' : 'muted'}
            onClick={() => switchTag(undefined)}
          >
            All
          </Badge>
          {TAGS.map((tag) => (
            <Badge
              key={tag}
              variant={activeTag === tag ? 'accent' : 'muted'}
              onClick={() => switchTag(tag)}
            >
              #{tag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="p-4">
        {isLoading && page === 0 ? (
          <PageSpinner />
        ) : allNews.length === 0 ? (
          <div className="py-12 text-center text-text-3">
            <p className="font-brand text-2xl mb-2">No news yet.</p>
            <p className="text-sm">News fetches automatically every hour.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {allNews.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
            {isFetching && <div className="flex justify-center py-4"><div className="w-5 h-5 animate-spin rounded-full border-2 border-border-dim border-t-accent" /></div>}
            <div ref={sentinelRef} className="h-1" />
          </div>
        )}
      </div>
    </div>
  )
}
