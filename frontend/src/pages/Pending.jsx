import { useAuth } from '../context/AuthContext'
import { Clock, LogOut } from 'lucide-react'

export default function PendingPage() {
  const { user, logout } = useAuth()
  return (
    <div className="theme-light-surface min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="text-center max-w-md animate-slide-up">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
          <Clock size={28} className="text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text)' }}>Awaiting Approval</h2>
        <p className="leading-relaxed mb-2" style={{ color: 'var(--text-muted)' }}>
          Hey <span style={{ color: 'var(--text)' }}>{user?.full_name}</span>, your account is pending admin approval.
        </p>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          Once approved as an aspirant, you'll be able to access all tests and study materials.
        </p>
        <button onClick={logout} className="btn-ghost flex items-center gap-2 mx-auto">
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  )
}
