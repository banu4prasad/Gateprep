import { useState } from 'react'
import type { ChangeEvent, CSSProperties, FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react'
import { authAPI } from '../api/api'
import { getApiErrorDetail } from '../lib/apiError'
import Spinner from '../components/shared/Spinner'
import Logo from '../components/shared/Logo'
import ThemeToggle from '../components/shared/ThemeToggle'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [form, setForm] = useState<{ password: string; confirm: string }>({ password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const cardStyle: CSSProperties & { [key: `--${string}`]: string } = { '--card-spacing': '1.5rem' }

  const handle = (key: 'password' | 'confirm') => (event: ChangeEvent<HTMLInputElement>): void =>
    setForm(formState => ({ ...formState, [key]: event.target.value }))

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (!token) { toast.error('Invalid reset link'); return }
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }

    setLoading(true)
    try {
      await authAPI.resetPassword({ token, password: form.password })
      toast.success('Password updated. Sign in again.')
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      toast.error(getApiErrorDetail(err) || 'Password reset failed')
    } finally {
      setLoading(false)
    }

  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground transition-colors duration-200">
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between gap-2 mb-8">
          <div className="flex items-center gap-2">
            <Logo size="md" />
            <span className="font-bold text-lg text-foreground">GATEPrep</span>
          </div>
          <ThemeToggle className="border border-border bg-card" />
        </div>

        <h1 className="text-2xl font-bold mb-1 text-foreground">Reset password</h1>
        <p className="text-sm mb-6 text-muted-foreground">Choose a new password for your account</p>

        <Card className="border-border shadow-sm" style={cardStyle}>
          <CardContent>
          {!token ? (
            <div className="text-center">
              <p className="text-sm mb-5 text-muted-foreground">This reset link is invalid.</p>
              <Button
                asChild
                variant="outline"
                className="w-full gap-2 rounded-md border-border bg-[var(--bg-panel)] text-foreground shadow-sm hover:bg-[var(--bg-panel)]/90"
              >
                <Link to="/login">
                  <ArrowLeft size={15} /> Back to sign in
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-muted-foreground">New password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={handle('password')}
                    placeholder="Min. 8 characters"
                    className="h-11 rounded-md bg-card px-4 pr-11 text-sm shadow-sm"
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    aria-label="Toggle new password visibility"
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground transition-colors hover:text-primary"
                  >
                    {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm" className="text-muted-foreground">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={form.confirm}
                    onChange={handle('confirm')}
                    placeholder="Re-enter password"
                    className="h-11 rounded-md bg-card px-4 pr-11 text-sm shadow-sm"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(s => !s)}
                    aria-label="Toggle confirm password visibility"
                    aria-pressed={showConfirm}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground transition-colors hover:text-primary"
                  >
                    {showConfirm ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="mt-2 h-11 w-full gap-2 rounded-md px-5 shadow-sm"
              >
                {loading ? <Spinner size={15} /> : <KeyRound size={15} aria-hidden="true" />}
                {loading ? 'Updating password...' : 'Update password'}
              </Button>
            </form>
          )}
          </CardContent>
        </Card>

        <p className="text-center mt-4 text-sm text-muted-foreground">
          Remember your password?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
