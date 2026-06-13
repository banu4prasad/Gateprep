import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../api/api'
import toast from 'react-hot-toast'
import Spinner from '../components/shared/Spinner'
import Eye from 'lucide-react/dist/esm/icons/eye'
import EyeOff from 'lucide-react/dist/esm/icons/eye-off'
import UserPlus from 'lucide-react/dist/esm/icons/user-plus'

export default function RegisterPage() {
  const { saveUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', full_name: '', password: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const handle = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
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
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="theme-light-surface min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded bg-sky-600 flex items-center justify-center">
            <span className="font-bold text-slate-900 dark:text-white">G</span>
          </div>
          <span className="font-bold text-lg" style={{ color: 'var(--text)' }}>GATEPrep</span>
        </div>

        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Create Account</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Fill in your details to get started</p>

        <div className="gate-card p-6">
          <form onSubmit={submit} className="space-y-6">
            <div>
              <label htmlFor="full_name" className="label">Full Name</label>
              <input id="full_name" type="text" required value={form.full_name} onChange={handle('full_name')}
                placeholder="Rahul Sharma" className="input" autoFocus />
            </div>
            <div>
              <label htmlFor="email" className="label">Email Address</label>
              <input id="email" type="email" required value={form.email} onChange={handle('email')}
                placeholder="you@example.com" className="input" />
            </div>
            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <input id="password" type={show ? 'text' : 'password'} required value={form.password}
                  onChange={handle('password')} placeholder="Min. 6 characters" className="input pr-10" />
                <button type="button" onClick={() => setShow(s => !s)}
                  aria-label="Toggle password visibility"
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-sky-500 transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirm" className="label">Confirm Password</label>
              <input id="confirm" type="password" required value={form.confirm} onChange={handle('confirm')}
                placeholder="Re-enter password" className="input" />
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-4">
              {loading ? <Spinner size={18} /> : <UserPlus size={18} />}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" className="text-sky-400 hover:text-sky-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
