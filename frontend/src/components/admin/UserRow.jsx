import { memo } from 'react'
import KeyRound from 'lucide-react/dist/esm/icons/key-round'
import UserX from 'lucide-react/dist/esm/icons/user-x'
import UserCheck from 'lucide-react/dist/esm/icons/user-check'
import Spinner from '../shared/Spinner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TableRow, TableCell } from '@/components/ui/table'
import { ROLE_STYLE } from './roleStyles'

export default memo(function UserRow({ user: u, updating, onChangeRole, onToggleStatus, onCreateResetLink }) {
  return (
    <TableRow className="hover:bg-slate-100 dark:hover:bg-slate-800/30">
      <TableCell className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-sky-400 text-xs font-semibold">{u.full_name[0]?.toUpperCase()}</span>
          </div>
          <span className="font-medium text-slate-700 dark:text-slate-200">{u.full_name}</span>
        </div>
      </TableCell>
      <TableCell className="px-5 py-4 text-slate-500 dark:text-slate-400">{u.email}</TableCell>
      <TableCell className="px-5 py-4">
        <Badge variant="outline" className={ROLE_STYLE[u.role]}>{u.role}</Badge>
      </TableCell>
      <TableCell className="px-5 py-4">
        <Badge variant="outline" className={u.is_active
          ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
          : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
        }>
          {u.is_active ? 'Active' : 'Disabled'}
        </Badge>
      </TableCell>
      <TableCell className="px-5 py-4 text-slate-500 dark:text-slate-400">
        {new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
      </TableCell>
      <TableCell className="px-5 py-4">
        <div className="flex items-center gap-2">
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
                  className="bg-slate-200 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600/50 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
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
      </TableCell>
    </TableRow>
  )
})
