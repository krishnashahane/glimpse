import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, ChevronDown } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { VoteButtons } from './VoteButtons'
import { PostEditor } from './PostEditor'
import { timeAgo, cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'

interface CommentData {
  id: string
  content: string
  upvotes: number
  downvotes: number
  userVote: number
  commentCount: number
  createdAt: string
  _count?: { replies: number }
  author: {
    id: string
    username: string
    handle: string
    avatar: string | null
    isVerified: boolean
  }
}

interface CommentCardProps {
  comment: CommentData
  depth?: number
  postId?: string
}

export function CommentCard({ comment, depth = 0, postId: _postId }: CommentCardProps) {
  const isAuth = useAuthStore((s) => s.isAuthenticated)
  const [replying, setReplying] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [up, setUp] = useState(comment.upvotes)
  const [down, setDown] = useState(comment.downvotes)
  const [uv, setUv] = useState(comment.userVote)

  const replyCount = comment._count?.replies ?? 0

  if (collapsed) {
    return (
      <div
        className="flex items-center gap-2 py-1 cursor-pointer text-text-3 hover:text-text-2 transition-colors"
        onClick={() => setCollapsed(false)}
      >
        <ChevronDown className="w-3.5 h-3.5" />
        <Avatar src={comment.author.avatar} name={comment.author.username} size="xs" />
        <span className="text-xs">@{comment.author.handle}</span>
        <span className="text-xs">[collapsed — {replyCount} replies]</span>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-2.5', depth > 0 && 'pl-4 border-l border-border-dim')}>
      {/* Vote */}
      <div className="flex flex-col items-center gap-0.5 pt-0.5">
        <VoteButtons
          postId={comment.id}
          upvotes={up}
          downvotes={down}
          userVote={uv}
          onVote={(u, d, v) => { setUp(u); setDown(d); setUv(v) }}
        />
      </div>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Avatar src={comment.author.avatar} name={comment.author.username} size="xs" />
          <Link to={`/u/${comment.author.handle}`} className="text-xs font-medium text-text-2 hover:text-text-1 transition-colors">
            @{comment.author.handle}
          </Link>
          {comment.author.isVerified && <span className="text-accent text-xs">✓</span>}
          <span className="text-text-3 text-xs">·</span>
          <span className="text-xs text-text-3">{timeAgo(comment.createdAt)}</span>
          <button
            onClick={() => setCollapsed(true)}
            className="ml-1 text-xs text-text-3 hover:text-text-2 transition-colors"
          >
            [–]
          </button>
        </div>

        {/* Body */}
        <p className="text-sm text-text-1 leading-relaxed whitespace-pre-wrap mb-2">
          {comment.content}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-1 mb-2">
          {isAuth && (
            <button
              onClick={() => setReplying((v) => !v)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-text-3 hover:bg-elevated hover:text-text-2 transition-all"
            >
              <MessageSquare className="w-3 h-3" />
              Reply
            </button>
          )}
        </div>

        {replying && (
          <div className="mb-3">
            <PostEditor
              parentId={comment.id}
              compact
              onSuccess={() => setReplying(false)}
              placeholder={`Reply to @${comment.author.handle}…`}
            />
          </div>
        )}
      </div>
    </div>
  )
}
