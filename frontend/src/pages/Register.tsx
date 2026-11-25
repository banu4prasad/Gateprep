import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../api/api'
import { getApiErrorDetail } from '../lib/apiError'
import toast from 'react-hot-toast'
import AuthLayout from '../components/shared/AuthLayout'
import Spinner from '../components/shared/Spinner'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Eye, EyeOff, UserPlus } from 'lucide-react'

interface RegisterForm {
  email: string
  full_name: string
  password: string
  confirm: string
}

export default function RegisterPage() {
  const { saveUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<RegisterForm>({ email: '', full_name: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const handle = (key: keyof RegisterForm) => (event: ChangeEvent<HTMLInputElement>): void =>
    setForm(formState => ({ ...formState, [key]: event.target.value }))

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const res = await authAPI.register({
        email: form.email,
        full_name: form.full_name,
        password: form.password
      })
      const user = saveUser(res.data)
      toast.success('Account created!')
      if (user.role === 'admin') navigate('/admin', { replace: true })
      else navigate('/pending', { replace: true })
    } catch (err: unknown) {
      toast.error(getApiErrorDetail(err) || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create account"
      subtitle="Fill in your details to get started"
      footer={
        <p className="text-center mt-4 text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="full_name" className="text-muted-foreground">Full name</Label>
          <Input
            id="full_name"
            name="full_name"
            type="text"
            autoComplete="name"
            required
            value={form.full_name}
            onChange={handle('full_name')}
            placeholder="Rahul Sharma"
            autoFocus
            className="h-11 rounded-md bg-card px-4 text-sm shadow-sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-muted-foreground">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            autoCapitalize="none"
            required
            value={form.email}
            onChange={handle('email')}
            placeholder="you@example.com"
            className="h-11 rounded-md bg-card px-4 text-sm shadow-sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-muted-foreground">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={form.password}
              onChange={handle('password')}
              placeholder="Min. 8 characters"
              className="h-11 rounded-md bg-card px-4 pr-11 text-sm shadow-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              aria-label="Toggle password visibility"
              aria-pressed={showPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground transition-colors hover:text-primary"
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm" className="text-muted-foreground">Confirm password</Label>
          <div className="relative">
            <Input
              id="confirm"
              name="confirm"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={form.confirm}
              onChange={handle('confirm')}
              placeholder="Re-enter password"
              className="h-11 rounded-md bg-card px-4 pr-11 text-sm shadow-sm"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(s => !s)}
              aria-label="Toggle confirm password visibility"
              aria-pressed={showConfirm}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground transition-colors hover:text-primary"
            >
              {showConfirm ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="mt-2 h-11 w-full rounded-md px-5 gap-2 shadow-sm"
        >
          {loading ? <Spinner size={18} /> : <UserPlus size={18} aria-hidden="true" />}
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
