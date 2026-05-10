import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Newspaper } from 'lucide-react'
import { NewsCard } from '@/components/news/NewsCard'
import { CommunityCard } from '@/components/community/CommunityCard'
import { newsApi, communityApi } from '@/lib/api'
import { Spinner } from '@/components/ui/Spinner'

export function RightPanel() {
  const { data: newsData, isLoading: newsLoading } = useQuery({
    queryKey: ['news', 'trending'],
    queryFn: () => newsApi.trending().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: commData } = useQuery({
    queryKey: ['communities', 'top'],
    queryFn: () => communityApi.list(0).then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  })

  return (
    <aside className="w-80 flex-shrink-0 sticky top-0 h-screen overflow-y-auto scrollbar-none py-6 px-3">
      {/* Trending News */}
      <div className="mb-6">
        <div className="flex items-center gap-2 px-1 mb-3">
          <Newspaper className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-text-1">Top News</h2>
        </div>
        {newsLoading ? (
          <div className="flex justify-center py-6"><Spinner size="sm" /></div>
        ) : (
          <div className="flex flex-col gap-2">
            {(newsData?.news || []).slice(0, 4).map((item: Parameters<typeof NewsCard>[0]['item']) => (
              <NewsCard key={item.id} item={item} compact />
            ))}
            <Link to="/news" className="text-xs text-accent hover:underline px-1">
              View all news →
            </Link>
          </div>
        )}
      </div>

      {/* Top Communities */}
      <div>
        <div className="flex items-center gap-2 px-1 mb-3">
          <TrendingUp className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-text-1">Top Communities</h2>
        </div>
        <div className="flex flex-col gap-2">
          {(commData?.communities || []).slice(0, 4).map((c: Parameters<typeof CommunityCard>[0]['community']) => (
            <CommunityCard key={c.id} community={c} />
          ))}
          <Link to="/communities" className="text-xs text-accent hover:underline px-1">
            Browse all →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 px-1">
        <p className="text-xs text-text-3 font-brand italic">"Some News Isn't For Everyone."</p>
        <p className="text-xs text-text-3 mt-1">© 2026 Glimpse</p>
      </div>
    </aside>
  )
}
