import { useState } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { postApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import toast from 'react-hot-toast'

interface VoteButtonsProps {
  postId: string
  upvotes: number
  downvotes: number
  userVote: number
  orientation?: 'vertical' | 'horizontal'
  onVote?: (upvotes: number, downvotes: number, userVote: number) => void
}

export function VoteButtons({ postId, upvotes, downvotes, userVote: initialVote, orientation = 'vertical', onVote }: VoteButtonsProps) {
  const isAuth = useAuthStore((s) => s.isAuthenticated)
  const [up, setUp] = useState(upvotes)
  const [down, setDown] = useState(downvotes)
  const [vote, setVote] = useState(initialVote)
  const [loading, setLoading] = useState(false)

  const score = up - down

  const handleVote = async (value: 1 | -1) => {
    if (!isAuth) { toast.error('Sign in to vote'); return }
    if (loading) return
    setLoading(true)
    try {
      const { data } = await postApi.vote(postId, value)
      setUp(data.upvotes)
      setDown(data.downvotes)
      setVote(data.userVote)
      onVote?.(data.upvotes, data.downvotes, data.userVote)
    } catch {
      toast.error('Vote failed')
    } finally {
      setLoading(false)
    }
  }

  if (orientation === 'horizontal') {
    return (
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => handleVote(1)}
          disabled={loading}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all',
            vote === 1 ? 'bg-upvote/15 text-upvote' : 'text-text-3 hover:bg-elevated hover:text-upvote',
          )}
        >
          <ArrowUp className="w-3.5 h-3.5" />
          <span>{formatNumber(up)}</span>
        </button>
        <button
          onClick={() => handleVote(-1)}
          disabled={loading}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all',
            vote === -1 ? 'bg-downvote/15 text-downvote' : 'text-text-3 hover:bg-elevated hover:text-downvote',
          )}
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>{formatNumber(down)}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        onClick={() => handleVote(1)}
        disabled={loading}
        className={cn(
          'p-1.5 rounded-lg transition-all',
          vote === 1 ? 'bg-upvote/15 text-upvote' : 'text-text-3 hover:bg-elevated hover:text-upvote',
        )}
      >
        <ArrowUp className="w-4 h-4" />
      </button>
      <span className={cn('text-xs font-semibold tabular-nums', score > 0 ? 'text-upvote' : score < 0 ? 'text-downvote' : 'text-text-3')}>
        {formatNumber(score)}
      </span>
      <button
        onClick={() => handleVote(-1)}
        disabled={loading}
        className={cn(
          'p-1.5 rounded-lg transition-all',
          vote === -1 ? 'bg-downvote/15 text-downvote' : 'text-text-3 hover:bg-elevated hover:text-downvote',
        )}
      >
        <ArrowDown className="w-4 h-4" />
      </button>
    </div>
  )
}
