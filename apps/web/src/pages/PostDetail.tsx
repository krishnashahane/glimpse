import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { useEffect } from 'react'
import { PostCard } from '@/components/post/PostCard'
import { PostEditor } from '@/components/post/PostEditor'
import { CommentCard } from '@/components/post/CommentCard'
import { PageSpinner } from '@/components/ui/Spinner'
import { useAuthStore } from '@/stores/auth'
import { postApi } from '@/lib/api'
import { getSocket } from '@/hooks/useSocket'

export default function PostDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isAuth = useAuthStore((s) => s.isAuthenticated)
  const qc = useQueryClient()

  const { data: postData, isLoading: postLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => postApi.get(id!).then((r) => r.data),
    enabled: !!id,
  })

  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => postApi.getComments(id!).then((r) => r.data),
    enabled: !!id,
  })

  useEffect(() => {
    const socket = getSocket()
    if (!socket || !id) return
    socket.emit('join:post', id)
    socket.on('post:new', () => qc.invalidateQueries({ queryKey: ['comments', id] }))
    return () => {
      socket.emit('leave:post', id)
      socket.off('post:new')
    }
  }, [id, qc])

  if (postLoading) return <PageSpinner />
  if (!postData?.post) return (
    <div className="flex flex-col items-center justify-center py-20 text-text-3">
      <p className="font-brand text-3xl">Post not found.</p>
    </div>
  )

  const { post } = postData

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-base/80 backdrop-blur-md border-b border-border-dim px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-text-3 hover:bg-elevated hover:text-text-1 transition-all">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-semibold text-text-1">Post</h1>
      </div>

      {/* Post */}
      <div className="p-4 border-b border-border-dim">
        <PostCard post={post} compact={false} />
      </div>

      {/* Reply editor */}
      {isAuth && (
        <div className="p-4 border-b border-border-dim">
          <PostEditor
            parentId={id}
            onSuccess={() => qc.invalidateQueries({ queryKey: ['comments', id] })}
            placeholder="Add a comment…"
          />
        </div>
      )}

      {/* Comments */}
      <div className="divide-y divide-border-dim">
        {commentsLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full w-6 h-6 border-2 border-border-dim border-t-accent" />
          </div>
        ) : commentsData?.comments?.length === 0 ? (
          <div className="py-12 text-center text-text-3 text-sm">
            No comments yet. Be the first.
          </div>
        ) : (
          (commentsData?.comments || []).map((comment: Parameters<typeof CommentCard>[0]['comment']) => (
            <div key={comment.id} className="p-4">
              <CommentCard comment={comment} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
