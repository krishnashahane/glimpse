import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/lib/api'
import toast from 'react-hot-toast'

const schema = z.object({
  username: z.string().min(3, 'Min 3 chars').max(30).regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, underscores only'),
  handle: z.string().min(3, 'Min 3 chars').max(30).regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, underscores only'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters').max(72),
})
type FormData = z.infer<typeof schema>

export default function Register() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.register(data)
      setAuth(res.data.user, res.data.token)
      toast.success(`Welcome to Glimpse, @${res.data.user.handle}!`)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg || 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-brand text-4xl font-bold text-text-1 mb-1">
            Glimpse<span className="text-accent">.</span>
          </h1>
          <p className="text-text-3 text-sm italic">"Some News Isn't For Everyone."</p>
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold text-text-1 mb-5">Create account</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              {...register('username')}
              label="Display Name"
              placeholder="Krishna Shahane"
              error={errors.username?.message}
            />
            <Input
              {...register('handle')}
              label="Handle"
              placeholder="krishna_s"
              error={errors.handle?.message}
            />
            <Input
              {...register('email')}
              type="email"
              label="Email"
              placeholder="you@example.com"
              error={errors.email?.message}
            />
            <Input
              {...register('password')}
              type="password"
              label="Password"
              placeholder="Min 8 characters"
              error={errors.password?.message}
            />
            <Button type="submit" loading={isSubmitting} className="w-full mt-1">
              Create Account
            </Button>
          </form>

          <p className="text-center text-xs text-text-3 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
