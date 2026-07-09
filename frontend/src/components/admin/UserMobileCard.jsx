import { memo } from 'react'
import KeyRound from 'lucide-react/dist/esm/icons/key-round'
import UserX from 'lucide-react/dist/esm/icons/user-x'
import UserCheck from 'lucide-react/dist/esm/icons/user-check'
import Spinner from '../shared/Spinner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ROLE_STYLE } from './roleStyles'

export default memo(function UserMobileCard({ user: u, updating, onChangeRole, onToggleStatus, onCreateResetLink }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-sky-400 text-sm font-semibold">{u.full_name[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{u.full_name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={ROLE_STYLE[u.role]}>{u.role}</Badge>
          <Badge variant="outline" className={u.is_active
            ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
            : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
          }>
            {u.is_active ? 'Active' : 'Disabled'}
          </Badge>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Joined {new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-200 dark:border-slate-800">
          {updating[u.id] ? <Spinner size={14} className="text-sky-400" /> : (
            <>
              {u.role === 'user' && (
                <Button size="xs" variant="ghost"
                  className="bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20"
                  onClick={() => onChangeRole(u.id, 'aspirant')}>
                  <UserCheck size={13} /> Approve
                </Button>
              )}
              {u.role === 'aspirant' && (
                <Button size="xs" variant="ghost"
                  className="bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                  onClick={() => onChangeRole(u.id, 'user')}>
                  <UserX size={13} /> Revoke
                </Button>
              )}
              {u.role !== 'admin' && (
                <Button size="xs" variant="ghost"
                  className="bg-slate-200 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600/50 text-slate-500 dark:text-slate-400"
                  onClick={() => onToggleStatus(u.id)}>
                  {u.is_active ? 'Disable' : 'Enable'}
                </Button>
              )}
              <Button size="xs" variant="ghost"
                className="bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20"
                disabled={updating[`reset-${u.id}`]}
                onClick={() => onCreateResetLink(u.id)}>
                {updating[`reset-${u.id}`] ? <Spinner size={13} /> : <KeyRound size={13} />} Reset
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
