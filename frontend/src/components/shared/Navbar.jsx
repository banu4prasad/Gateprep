import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { LogOut, Sun, Moon, LayoutDashboard, FlaskConical, Users, BookOpen, ClipboardList, Bookmark, CheckSquare } from 'lucide-react'
import clsx from 'clsx'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const isAdmin = user?.role === 'admin'

  const adminLinks = [
    { to: '/admin',           label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/tests',     label: 'Tests',     icon: FlaskConical },
    { to: '/admin/users',     label: 'Users',     icon: Users },
    { to: '/admin/checklist', label: 'Checklist', icon: CheckSquare },
  ]

  const aspirantLinks = [
    { to: '/dashboard',  label: 'Dashboard', icon: LayoutDashboard },
    { to: '/tests',      label: 'Tests',     icon: BookOpen },
    { to: '/results',    label: 'Results',   icon: ClipboardList },
    { to: '/bookmarks',  label: 'Bookmarks', icon: Bookmark },
    { to: '/checklist',  label: 'Syllabus',  icon: CheckSquare },
  ]

  const links = isAdmin ? adminLinks : aspirantLinks

  return (
    <nav className="app-header fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 gap-4 border-b"
         style={{ background: 'var(--header-bg)', borderColor: 'var(--border)', backdropFilter: 'blur(8px)' }}>
      <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2 mr-4 flex-shrink-0">
        <div className="w-7 h-7 rounded bg-sky-600 flex items-center justify-center">
          <span className="font-bold text-slate-900 dark:text-white text-sm">G</span>
        </div>
        <span className="font-bold text-slate-900 dark:text-white text-sm hidden sm:block">GATEPrep</span>
      </Link>

      <div className="flex items-center gap-0.5 flex-1 overflow-x-auto">
        {links.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors',
            location.pathname === to || (to !== '/admin' && to !== '/dashboard' && location.pathname.startsWith(to))
              ? 'bg-sky-600/20 text-sky-600 dark:text-sky-400'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-500 dark:text-slate-400 dark:hover:text-slate-700 dark:text-slate-200 dark:hover:bg-slate-100 dark:bg-slate-800/50'
          )}>
            <Icon size={16} /> <span className="hidden sm:inline">{label}</span>
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={toggle}
          title="Toggle theme"
          aria-label="Toggle theme"
          className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800 transition-colors">
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <div className="text-right hidden sm:block">
          <p className="text-xs font-medium text-slate-900 dark:text-white leading-none">{user?.full_name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role}</p>
        </div>
        <button onClick={logout}
          title="Log out"
          aria-label="Log out"
          className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
          <LogOut size={14} />
        </button>
      </div>
    </nav>
  )
}
