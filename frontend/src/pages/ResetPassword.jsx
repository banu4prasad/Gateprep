import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react'
import { authAPI } from '../api/api'
import Spinner from '../components/shared/Spinner'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const handle = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    if (!token) { toast.error('Invalid reset link'); return }
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }

    setLoading(true)
    try {
      await authAPI.resetPassword({ token, password: form.password })
      toast.success('Password updated. Sign in again.')
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Password reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="theme-light-surface min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded bg-sky-600 flex items-center justify-center">
            <span className="font-bold text-white">G</span>
          </div>
          <span className="font-bold text-lg" style={{ color: 'var(--text)' }}>GATEPrep</span>
        </div>

        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Reset password</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Choose a new password for your account</p>

        <div className="gate-card p-6">
          {!token ? (
            <div className="text-center">
              <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>This reset link is invalid.</p>
              <Link to="/login" className="btn-ghost w-full flex items-center justify-center gap-2">
                <ArrowLeft size={15} /> Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={handle('password')}
                    placeholder="Min. 6 characters"
                    className="input pr-10"
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShow(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input
                  type={show ? 'text' : 'password'}
                  required
                  value={form.confirm}
                  onChange={handle('confirm')}
                  placeholder="Re-enter password"
                  className="input"
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <Spinner size={15} /> : <KeyRound size={15} />}
                {loading ? 'Updating password...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          Remember your password?{' '}
          <Link to="/login" className="text-sky-400 hover:text-sky-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
