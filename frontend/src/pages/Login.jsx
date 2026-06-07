import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../api/api'
import toast from 'react-hot-toast'
import Spinner from '../components/shared/Spinner'
import { Eye, EyeOff, LogIn, CheckCircle2, ListChecks, Hash } from 'lucide-react'

export default function LoginPage() {
  const { saveUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const handle = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authAPI.login({ email: form.email, password: form.password })
      const user = saveUser(res.data)
      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}!`)
      if (user.role === 'admin') navigate('/admin', { replace: true })
      else if (user.role === 'aspirant') navigate('/dashboard', { replace: true })
      else navigate('/pending', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid email or password')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 p-12"
           style={{ background: 'var(--header-bg)', borderRight: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-sky-600 flex items-center justify-center">
            <span className="font-bold text-slate-900 dark:text-white text-lg">G</span>
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-xl">GATEPrep</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white leading-tight mb-4">
            Crack GATE with<br />
            <span className="text-sky-400">precision practice.</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            MCQ · MSQ · NAT · GATE-accurate scoring<br />
            Timed tests · Leaderboards · Analytics
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            ['MCQ', 'Single correct', <CheckCircle2 size={16} />],
            ['MSQ', 'Multi-select', <ListChecks size={16} />],
            ['NAT', 'Numerical', <Hash size={16} />]
          ].map(([t, d, icon]) => (
            <div key={t} className="p-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-800/40 flex flex-col items-start hover:bg-slate-100 dark:bg-slate-800/60 transition-colors shadow-sm hover:shadow">
              <div className="text-sky-400 mb-2">{icon}</div>
              <p className="font-bold text-sky-400">{t}</p>
              <p className="text-slate-600 dark:text-slate-300 text-xs mt-0.5">{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="theme-light-surface flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-slide-up">
          <div className="lg:hidden mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded bg-sky-600 flex items-center justify-center">
                <span className="font-bold text-slate-900 dark:text-white">G</span>
              </div>
              <span className="font-bold text-lg" style={{ color: 'var(--text)' }}>GATEPrep</span>
            </div>
            <h1 className="text-2xl font-bold leading-tight" style={{ color: 'var(--text)' }}>
              Crack GATE with <span className="text-sky-500">precision practice.</span>
            </h1>
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Sign in</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Enter your credentials to continue</p>

          <div className="gate-card p-6">
            <form onSubmit={submit} className="space-y-6">
              <div>
                <label htmlFor="email" className="label">Email address</label>
                <input id="email" type="email" required value={form.email} onChange={handle('email')}
                  placeholder="you@example.com" className="input" autoFocus />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="label !mb-0">Password</label>
                  <Link to="/forgot-password" className="text-xs text-sky-500 hover:text-sky-400 font-medium">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input id="password" type={show ? 'text' : 'password'} required value={form.password}
                    onChange={handle('password')} placeholder="••••••••" className="input pr-10" />
                  <button type="button" onClick={() => setShow(s => !s)}
                    aria-label="Toggle password visibility"
                    className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-sky-500 transition-colors"
                    style={{ color: 'var(--text-muted)' }}>
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-4">
                {loading ? <Spinner size={18} /> : <LogIn size={18} />}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          <p className="text-center mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" className="text-sky-400 hover:text-sky-300 font-medium">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
