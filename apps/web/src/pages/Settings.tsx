import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/stores/auth'
import { userApi } from '@/lib/api'
import toast from 'react-hot-toast'

const schema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional().or(z.literal('')),
  location: z.string().max(100).optional(),
})
type FormData = z.infer<typeof schema>

export default function Settings() {
  const { user, updateUser } = useAuthStore()

  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: user?.username || '',
      bio: user?.bio || '',
      website: user?.website || '',
      location: user?.location || '',
    },
  })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await userApi.updateMe(data)
      updateUser(res.data.user)
      toast.success('Profile updated')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg || 'Update failed')
    }
  }

  if (!user) return null

  return (
    <div>
      <div className="sticky top-0 z-10 bg-base/80 backdrop-blur-md border-b border-border-dim px-4 py-3">
        <h1 className="text-base font-semibold text-text-1">Settings</h1>
      </div>

      <div className="max-w-lg mx-auto p-4">
        {/* Avatar section */}
        <div className="card p-4 mb-4">
          <h2 className="text-sm font-semibold text-text-1 mb-3">Profile Picture</h2>
          <div className="flex items-center gap-4">
            <Avatar src={user.avatar} name={user.username} size="xl" />
            <div>
              <Button variant="outline" size="sm">Change Photo</Button>
              <p className="text-xs text-text-3 mt-1.5">JPG, PNG or WebP. Max 5MB.</p>
            </div>
          </div>
        </div>

        {/* Profile form */}
        <div className="card p-4 mb-4">
          <h2 className="text-sm font-semibold text-text-1 mb-4">Profile Info</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              {...register('username')}
              label="Display Name"
              error={errors.username?.message}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-2">Handle</label>
              <div className="input opacity-50 cursor-not-allowed">@{user.handle}</div>
              <p className="text-xs text-text-3">Handles cannot be changed.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-2">Bio</label>
              <textarea
                {...register('bio')}
                rows={3}
                placeholder="Tell people about yourself…"
                className="input resize-none"
              />
            </div>
            <Input
              {...register('website')}
              label="Website"
              placeholder="https://yoursite.com"
              error={errors.website?.message}
            />
            <Input
              {...register('location')}
              label="Location"
              placeholder="San Francisco, CA"
              error={errors.location?.message}
            />
            <Button type="submit" loading={isSubmitting} disabled={!isDirty} className="self-end">
              Save Changes
            </Button>
          </form>
        </div>

        {/* Account info */}
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-text-1 mb-3">Account</h2>
          <div className="flex flex-col gap-2 text-sm text-text-2">
            <div className="flex justify-between">
              <span>Email</span>
              <span className="text-text-3">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span>Role</span>
              <span className="text-text-3 capitalize">{user.role.toLowerCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>Member since</span>
              <span className="text-text-3">{new Date(user.createdAt).getFullYear()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
