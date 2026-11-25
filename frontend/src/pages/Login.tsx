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
import { Eye, EyeOff, LogIn } from 'lucide-react'

interface LoginForm {
  email: string
  password: string
}

export default function LoginPage() {
  const { saveUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<LoginForm>({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const handle = (key: keyof LoginForm) => (event: ChangeEvent<HTMLInputElement>): void =>
    setForm(formState => ({ ...formState, [key]: event.target.value }))

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setLoading(true)
    try {
      const res = await authAPI.login({ email: form.email, password: form.password })
      const user = saveUser(res.data)
      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}!`)
      if (user.role === 'admin') navigate('/admin', { replace: true })
      else if (user.role === 'aspirant') navigate('/dashboard', { replace: true })
      else navigate('/pending', { replace: true })
    } catch (err: unknown) {
      const hasResponse = err && typeof err === 'object' && 'response' in err && Boolean(err.response)
      const errMsg = hasResponse
        ? getApiErrorDetail(err) || 'Invalid email or password'
        : 'Network Error: Could not connect to the server.'
      toast.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Enter your credentials to continue"
      footer={
        <p className="text-center mt-4 text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-primary hover:underline font-medium">
            Create one
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-6">
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
            autoFocus
            className="h-11 rounded-md bg-card px-4 text-sm shadow-sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="password" className="text-muted-foreground">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={form.password}
              onChange={handle('password')}
              placeholder="••••••••"
              className="h-11 rounded-md bg-card px-4 pr-11 text-sm shadow-sm"
            />
            <button
              type="button"
              onClick={() => setShow(s => !s)}
              aria-label="Toggle password visibility"
              aria-pressed={show}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground transition-colors hover:text-primary"
            >
              {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="mt-2 h-11 w-full rounded-md px-5 gap-2 shadow-sm"
        >
          {loading ? <Spinner size={18} /> : <LogIn size={18} aria-hidden="true" />}
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
