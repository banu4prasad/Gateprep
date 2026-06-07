import { useEffect, useState } from 'react'
import Layout from '../components/shared/Layout'
import { adminAPI } from '../api/api'
import toast from 'react-hot-toast'
import { Copy, KeyRound, Search, UserX, UserCheck, RefreshCw, X } from 'lucide-react'
import Spinner from '../components/shared/Spinner'

const ROLES = ['admin', 'aspirant', 'user']
const roleStyle = { admin: 'badge-blue', aspirant: 'badge-green', user: 'badge-amber' }

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState({})
  const [resetLink, setResetLink] = useState(null)

  const load = () => {
    setLoading(true)
    adminAPI.getUsers().then(r => setUsers(r.data)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const changeRole = async (userId, role) => {
    setUpdating(u => ({ ...u, [userId]: true }))
    try {
      await adminAPI.updateRole(userId, role)
      setUsers(us => us.map(u => u.id === userId ? { ...u, role } : u))
      toast.success(`Role updated to ${role}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally {
      setUpdating(u => ({ ...u, [userId]: false }))
    }
  }

  const toggleStatus = async (userId) => {
    setUpdating(u => ({ ...u, [userId]: true }))
    try {
      await adminAPI.toggleStatus(userId)
      setUsers(us => us.map(u => u.id === userId ? { ...u, is_active: !u.is_active } : u))
      toast.success('Status updated')
    } catch {
      toast.error('Failed')
    } finally {
      setUpdating(u => ({ ...u, [userId]: false }))
    }
  }

  const createResetLink = async (userId) => {
    const key = `reset-${userId}`
    setUpdating(u => ({ ...u, [key]: true }))
    try {
      const res = await adminAPI.createPasswordReset(userId)
      setResetLink(res.data)
      toast.success('Reset link created')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create reset link')
    } finally {
      setUpdating(u => ({ ...u, [key]: false }))
    }
  }

  const copyResetLink = async () => {
    if (!resetLink?.reset_url) return
    try {
      await navigator.clipboard.writeText(resetLink.reset_url)
      toast.success('Reset link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Users</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{users.length} registered · {users.filter(u=>u.role==='user').length} pending approval</p>
          </div>
          <button onClick={load} className="btn-ghost flex items-center gap-2">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="input pl-10"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={28} className="text-sky-500" /></div>
        ) : (
          <>
            <div className="gate-card overflow-hidden hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  {['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-slate-100 dark:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-sky-400 text-xs font-semibold">{u.full_name[0]?.toUpperCase()}</span>
                        </div>
                        <span className="font-medium text-slate-700 dark:text-slate-200">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{u.email}</td>
                    <td className="px-5 py-4">
                      <span className={`badge ${roleStyle[u.role] || 'badge-slate'}`}>{u.role}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                      {new Date(u.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {updating[u.id] ? <Spinner size={14} className="text-sky-400" /> : (
                          <>
                            {u.role === 'user' && (
                              <button
                                onClick={() => changeRole(u.id, 'aspirant')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors"
                              >
                                <UserCheck size={13} /> Approve
                              </button>
                            )}
                            {u.role === 'aspirant' && (
                              <button
                                onClick={() => changeRole(u.id, 'user')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors"
                              >
                                <UserX size={13} /> Revoke
                              </button>
                            )}
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => toggleStatus(u.id)}
                                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600/50 text-slate-500 dark:text-slate-400 text-xs font-medium hover:bg-slate-200 dark:bg-slate-700 transition-colors"
                              >
                                {u.is_active ? 'Disable' : 'Enable'}
                              </button>
                            )}
                            <button
                              onClick={() => createResetLink(u.id)}
                              disabled={updating[`reset-${u.id}`]}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium hover:bg-sky-500/20 transition-colors disabled:opacity-50"
                            >
                              {updating[`reset-${u.id}`] ? <Spinner size={13} /> : <KeyRound size={13} />} Reset
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-500 dark:text-slate-400">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            {filtered.map(u => (
              <div key={u.id} className="gate-card p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-500/20 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sky-400 text-sm font-semibold">{u.full_name[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>{u.full_name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge ${roleStyle[u.role] || 'badge-slate'}`}>{u.role}</span>
                  <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                    {u.is_active ? 'Active' : 'Disabled'}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Joined {new Date(u.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  {updating[u.id] ? <Spinner size={14} className="text-sky-400" /> : (
                    <>
                      {u.role === 'user' && (
                        <button onClick={() => changeRole(u.id, 'aspirant')}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors">
                          <UserCheck size={13} /> Approve
                        </button>
                      )}
                      {u.role === 'aspirant' && (
                        <button onClick={() => changeRole(u.id, 'user')}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors">
                          <UserX size={13} /> Revoke
                        </button>
                      )}
                      {u.role !== 'admin' && (
                        <button onClick={() => toggleStatus(u.id)}
                          className="px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600/50 text-slate-500 dark:text-slate-400 text-xs font-medium">
                          {u.is_active ? 'Disable' : 'Enable'}
                        </button>
                      )}
                      <button onClick={() => createResetLink(u.id)} disabled={updating[`reset-${u.id}`]}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium hover:bg-sky-500/20 transition-colors disabled:opacity-50">
                        {updating[`reset-${u.id}`] ? <Spinner size={13} /> : <KeyRound size={13} />} Reset
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No users found</p>
            )}
          </div>
          </>
        )}

        {resetLink && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="gate-card w-full max-w-lg p-5 animate-slide-up">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Password Reset Link</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{resetLink.full_name} · {resetLink.email}</p>
                </div>
                <button
                  onClick={() => setResetLink(null)}
                  className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800 transition-colors"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <label className="label">Reset Link</label>
              <input
                value={resetLink.reset_url}
                readOnly
                className="input font-mono text-xs"
                aria-label="Password reset link"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Expires {new Date(resetLink.expires_at).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>

              <div className="flex items-center justify-end gap-3 mt-5">
                <button onClick={() => setResetLink(null)} className="btn-ghost">
                  Close
                </button>
                <button onClick={copyResetLink} className="btn-primary flex items-center gap-2">
                  <Copy size={15} /> Copy Link
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
