import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import LogOut from 'lucide-react/dist/esm/icons/log-out'
import Sun from 'lucide-react/dist/esm/icons/sun'
import Moon from 'lucide-react/dist/esm/icons/moon'
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard'
import FlaskConical from 'lucide-react/dist/esm/icons/flask-conical'
import Users from 'lucide-react/dist/esm/icons/users'
import BookOpen from 'lucide-react/dist/esm/icons/book-open'
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list'
import Bookmark from 'lucide-react/dist/esm/icons/bookmark'
import clsx from 'clsx'

export default function Navbar() {
  const { user, logout, loading } = useAuth()
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const isAdmin = user?.role === 'admin'

  const adminLinks = [
    { to: '/admin',           label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/tests',     label: 'Tests',     icon: FlaskConical },
    { to: '/admin/users',     label: 'Users',     icon: Users },
  ]

  const aspirantLinks = [
    { to: '/dashboard',  label: 'Dashboard', icon: LayoutDashboard },
    { to: '/tests',      label: 'Tests',     icon: BookOpen },
    { to: '/results',    label: 'Results',   icon: ClipboardList },
    { to: '/bookmarks',  label: 'Bookmarks', icon: Bookmark },
  ]

  const links = isAdmin ? adminLinks : aspirantLinks

  const isActive = (to) =>
    location.pathname === to || (to !== '/admin' && to !== '/dashboard' && location.pathname.startsWith(to))

  return (
    <>
      {/* ── Desktop/Tablet Top Bar ────────────────────────────────── */}
      <nav aria-label="Main Navigation" className="app-header fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-3 sm:px-4 gap-2 sm:gap-4 border-b"
           style={{ background: 'var(--header-bg)', borderColor: 'var(--border)', backdropFilter: 'blur(8px)' }}>
        <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2 mr-2 sm:mr-4 flex-shrink-0">
          <div className="w-7 h-7 rounded bg-sky-600 flex items-center justify-center">
            <span className="font-bold text-slate-900 dark:text-white text-sm">G</span>
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-sm">GATEPrep</span>
        </Link>

        {/* Desktop nav links — hidden on mobile (shown in bottom nav instead) */}
        <div className="hidden sm:flex items-center gap-0.5 flex-1 overflow-x-auto">
          {!loading && links.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} aria-current={isActive(to) ? 'page' : undefined} className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors',
              isActive(to)
                ? 'bg-sky-600/20 text-sky-600 dark:text-sky-400'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
            )}>
              <Icon size={16} /> <span>{label}</span>
            </Link>
          ))}
        </div>

        {/* Mobile spacer */}
        <div className="flex-1 sm:hidden" />

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button onClick={toggle}
            title="Toggle theme"
            aria-label="Toggle theme"
            className="p-2 sm:p-1.5 rounded text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          {loading ? (
            <div className="hidden sm:flex flex-col gap-1.5 items-end mx-1">
              <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" aria-hidden="true" />
              <div className="h-2 w-14 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" aria-hidden="true" />
            </div>
          ) : (
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-slate-900 dark:text-white leading-none">{user?.full_name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role}</p>
            </div>
          )}
          <button onClick={logout}
            title="Log out"
            aria-label="Log out"
            className="p-2 sm:p-1.5 rounded text-slate-500 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut size={14} />
          </button>
        </div>
      </nav>

      {/* ── Mobile Bottom Navigation ──────────────────────────────── */}
      <nav aria-label="Mobile Navigation" className="mobile-bottom-nav sm:hidden flex items-center justify-around px-1">
        {!loading && links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            aria-current={isActive(to) ? 'page' : undefined}
            className={clsx(
              'flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 min-w-[52px] rounded-lg transition-colors',
              isActive(to)
                ? 'text-sky-500'
                : 'text-slate-500 dark:text-slate-400'
            )}
          >
            <Icon size={20} strokeWidth={isActive(to) ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
