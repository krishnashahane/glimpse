import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { PostCard, type PostData } from '@/components/post/PostCard'
import { PostEditor } from '@/components/post/PostEditor'
import { PostSkeleton } from '@/components/ui/Spinner'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { feedApi, type FeedType } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'

const TABS: { key: FeedType; label: string }[] = [
  { key: 'for_you', label: 'For You' },
  { key: 'trending', label: 'Trending' },
  { key: 'latest', label: 'Latest' },
  { key: 'following', label: 'Following' },
]

export default function Home() {
  const [feedType, setFeedType] = useState<FeedType>('for_you')
  const [page, setPage] = useState(0)
  const [allPosts, setAllPosts] = useState<PostData[]>([])
  const [hasMore, setHasMore] = useState(true)
  const isAuth = useAuthStore((s) => s.isAuthenticated)
  const qc = useQueryClient()

  const { isLoading, isFetching } = useQuery({
    queryKey: ['feed', feedType, page],
    queryFn: async () => {
      const { data } = await feedApi.get(feedType, page)
      if (page === 0) {
        setAllPosts(data.posts)
      } else {
        setAllPosts((prev) => [...prev, ...data.posts])
      }
      setHasMore(data.hasMore)
      return data
    },
    staleTime: 60_000,
  })

  const loadMore = useCallback(() => {
    if (!isFetching && hasMore) setPage((p) => p + 1)
  }, [isFetching, hasMore])

  const sentinelRef = useInfiniteScroll(loadMore, hasMore, isFetching)

  const switchTab = (tab: FeedType) => {
    setFeedType(tab)
    setPage(0)
    setAllPosts([])
    setHasMore(true)
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-base/80 backdrop-blur-md border-b border-border-dim">
        <div className="flex items-center gap-1 px-4 pt-4 pb-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={cn(
                'relative px-3 py-2 text-sm font-medium transition-colors',
                feedType === tab.key ? 'text-text-1' : 'text-text-3 hover:text-text-2',
              )}
            >
              {tab.label}
              {feedType === tab.key && (
                <motion.div
                  layoutId="feed-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Compose */}
      {isAuth && (
        <div className="p-4 border-b border-border-dim">
          <PostEditor
            onSuccess={() => {
              setPage(0)
              setAllPosts([])
              qc.invalidateQueries({ queryKey: ['feed', feedType] })
            }}
          />
        </div>
      )}

      {/* Feed */}
      <div className="divide-y divide-border-dim">
        {isLoading && page === 0 ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4">
              <PostSkeleton />
            </div>
          ))
        ) : allPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-3">
            <p className="font-brand text-3xl mb-2">Nothing here yet.</p>
            <p className="text-sm">Follow users or join communities to see posts.</p>
          </div>
        ) : (
          <>
            {allPosts.map((post) => (
              <div key={post.id} className="p-4">
                <PostCard post={post} compact />
              </div>
            ))}
            {isFetching && page > 0 && (
              <div className="p-4">
                <PostSkeleton />
              </div>
            )}
            <div ref={sentinelRef} className="h-1" />
            {!hasMore && allPosts.length > 0 && (
              <div className="py-10 text-center text-xs text-text-3">
                You've reached the end. Take a break.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
