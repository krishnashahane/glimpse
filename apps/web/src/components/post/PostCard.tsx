import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MessageSquare, Share2, Bookmark, MoreHorizontal, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { VoteButtons } from './VoteButtons'
import { timeAgo, truncate, cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export interface PostData {
  id: string
  content: string
  type: string
  mediaUrls: string[]
  linkUrl?: string | null
  linkTitle?: string | null
  linkImage?: string | null
  upvotes: number
  downvotes: number
  commentCount: number
  views: number
  isPinned: boolean
  isNsfw: boolean
  userVote: number
  createdAt: string
  author: {
    id: string
    username: string
    handle: string
    avatar: string | null
    isVerified: boolean
  }
  community?: {
    id: string
    name: string
    slug: string
    avatar?: string | null
  } | null
  tags: { name: string; slug: string }[]
}

interface PostCardProps {
  post: PostData
  compact?: boolean
  showCommunity?: boolean
}

export function PostCard({ post, compact = false, showCommunity = true }: PostCardProps) {
  const navigate = useNavigate()
  const [upvotes, setUpvotes] = useState(post.upvotes)
  const [downvotes, setDownvotes] = useState(post.downvotes)
  const [userVote, setUserVote] = useState(post.userVote)

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(`${window.location.origin}/p/${post.id}`)
    toast.success('Link copied')
  }

  const openPost = () => navigate(`/p/${post.id}`)

  return (
    <motion.article
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="card flex gap-3 p-4 hover:border-border-bright transition-all duration-200 group cursor-pointer"
      onClick={openPost}
    >
      {/* Vote column */}
      <div onClick={(e) => e.stopPropagation()}>
        <VoteButtons
          postId={post.id}
          upvotes={upvotes}
          downvotes={downvotes}
          userVote={userVote}
          onVote={(u, d, v) => { setUpvotes(u); setDownvotes(d); setUserVote(v) }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Meta */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {showCommunity && post.community && (
            <Link
              to={`/c/${post.community.slug}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-medium text-accent hover:underline"
            >
              c/{post.community.name}
            </Link>
          )}
          {showCommunity && post.community && <span className="text-text-3 text-xs">·</span>}
          <Link
            to={`/u/${post.author.handle}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 group/author"
          >
            <Avatar src={post.author.avatar} name={post.author.username} size="xs" />
            <span className="text-xs text-text-2 group-hover/author:text-text-1 transition-colors">
              @{post.author.handle}
            </span>
            {post.author.isVerified && (
              <span className="text-accent text-xs">✓</span>
            )}
          </Link>
          <span className="text-text-3 text-xs">·</span>
          <span className="text-xs text-text-3">{timeAgo(post.createdAt)}</span>
          {post.isPinned && <Badge variant="accent">📌 Pinned</Badge>}
          {post.isNsfw && <Badge variant="warning">NSFW</Badge>}
        </div>

        {/* Content */}
        <div className="mb-2.5">
          {post.type === 'LINK' && post.linkUrl ? (
            <div>
              <p className="text-text-1 text-sm leading-relaxed mb-2">
                {compact ? truncate(post.content, 200) : post.content}
              </p>
              <a
                href={post.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 p-3 rounded-lg bg-elevated border border-border-dim hover:border-border-bright transition-colors group/link"
              >
                {post.linkImage && (
                  <img src={post.linkImage} alt="" className="w-16 h-12 object-cover rounded-md flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-1 truncate">{post.linkTitle || post.linkUrl}</p>
                  <p className="text-xs text-text-3 truncate mt-0.5">{post.linkUrl}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-text-3 flex-shrink-0 group-hover/link:text-accent transition-colors" />
              </a>
            </div>
          ) : (
            <p className="text-text-1 text-sm leading-relaxed whitespace-pre-wrap">
              {compact ? truncate(post.content, 300) : post.content}
            </p>
          )}
        </div>

        {/* Media */}
        {post.mediaUrls.length > 0 && (
          <div className={cn('grid gap-1.5 mb-2.5 rounded-xl overflow-hidden', post.mediaUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
            {post.mediaUrls.slice(0, 4).map((url, i) => (
              <img key={i} src={url} alt="" className="w-full h-48 object-cover" onClick={(e) => e.stopPropagation()} />
            ))}
          </div>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {post.tags.map((tag) => (
              <Badge key={tag.slug} variant="muted" onClick={(e) => { (e as unknown as React.MouseEvent).stopPropagation?.(); navigate(`/explore?tag=${tag.slug}`) }}>
                #{tag.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={openPost}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-text-3 hover:bg-elevated hover:text-text-2 transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{post.commentCount}</span>
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-text-3 hover:bg-elevated hover:text-text-2 transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-text-3 hover:bg-elevated hover:text-text-2 transition-all">
            <Bookmark className="w-3.5 h-3.5" />
          </button>
          <button className="ml-auto flex items-center px-2 py-1.5 rounded-lg text-xs text-text-3 hover:bg-elevated hover:text-text-2 transition-all opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.article>
  )
}
