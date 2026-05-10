import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Image, Link, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth'
import { postApi } from '@/lib/api'
import toast from 'react-hot-toast'

const schema = z.object({
  content: z.string().min(1, 'Write something').max(40000),
  type: z.enum(['TEXT', 'LINK']).default('TEXT'),
  linkUrl: z.string().url().optional().or(z.literal('')),
  tags: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface PostEditorProps {
  communityId?: string
  parentId?: string
  onSuccess?: () => void
  placeholder?: string
  compact?: boolean
}

export function PostEditor({ communityId, parentId, onSuccess, placeholder, compact }: PostEditorProps) {
  const user = useAuthStore((s) => s.user)
  const [showLink, setShowLink] = useState(false)
  const qc = useQueryClient()

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'TEXT' },
  })

  const content = watch('content') || ''

  const onSubmit = async (data: FormData) => {
    try {
      const tags = data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
      await postApi.create({
        content: data.content,
        type: data.linkUrl ? 'LINK' : 'TEXT',
        communityId: communityId || undefined,
        parentId: parentId || undefined,
        linkUrl: data.linkUrl || undefined,
        tags,
      })
      reset()
      qc.invalidateQueries({ queryKey: ['feed'] })
      qc.invalidateQueries({ queryKey: ['comments', parentId] })
      toast.success(parentId ? 'Reply posted' : 'Post published')
      onSuccess?.()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg || 'Failed to post')
    }
  }

  if (!user) return null

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={compact ? '' : 'card p-4'}>
      <div className="flex gap-3">
        {!compact && <Avatar src={user.avatar} name={user.username} size="sm" />}
        <div className="flex-1 min-w-0">
          <textarea
            {...register('content')}
            placeholder={placeholder || (parentId ? 'Write a reply…' : "What's on your mind?")}
            rows={compact ? 2 : 3}
            className="w-full bg-transparent text-sm text-text-1 placeholder:text-text-3 outline-none resize-none leading-relaxed"
          />
          {errors.content && <p className="text-xs text-danger mt-1">{errors.content.message}</p>}

          {showLink && (
            <input
              {...register('linkUrl')}
              type="url"
              placeholder="https://..."
              className="w-full mt-2 bg-elevated border border-border-dim rounded-lg px-3 py-1.5 text-sm text-text-1 placeholder:text-text-3 outline-none focus:border-accent/50"
            />
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-dim">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="p-1.5 rounded-lg text-text-3 hover:bg-elevated hover:text-accent transition-all"
                onClick={() => setShowLink((v) => !v)}
              >
                <Link className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 rounded-lg text-text-3 hover:bg-elevated hover:text-accent transition-all"
              >
                <Image className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs ${content.length > 39000 ? 'text-danger' : 'text-text-3'}`}>
                {content.length}/40k
              </span>
              <Button type="submit" size="sm" loading={isSubmitting} disabled={!content.trim()}>
                {parentId ? 'Reply' : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
