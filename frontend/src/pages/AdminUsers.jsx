import { useMemo, useState, useEffect, memo, useCallback } from 'react'
import Layout from '../components/shared/Layout'
import { adminAPI, fetcher } from '../api/api'
import useSWR from 'swr'
import toast from 'react-hot-toast'
import Copy from 'lucide-react/dist/esm/icons/copy'
import KeyRound from 'lucide-react/dist/esm/icons/key-round'
import Search from 'lucide-react/dist/esm/icons/search'
import UserX from 'lucide-react/dist/esm/icons/user-x'
import UserCheck from 'lucide-react/dist/esm/icons/user-check'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import Spinner from '../components/shared/Spinner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog'

/* ─── constants ─── */
const ROLE_STYLE = {
  admin: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  aspirant: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  user: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
}

/* ─── memoised sub-components (React perf best-practice) ─── */

/** Desktop table row – only re-renders when its own user or updating state changes. */
const UserRow = memo(function UserRow({ user: u, updating, onChangeRole, onToggleStatus, onCreateResetLink }) {
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

/** Mobile card view – only re-renders when its own user or updating state changes. */
const UserMobileCard = memo(function UserMobileCard({ user: u, updating, onChangeRole, onToggleStatus, onCreateResetLink }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-sky-400 text-sm font-semibold">{u.full_name[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{u.full_name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</p>
          </div>
        </div>

        {/* Badges */}
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

        {/* Actions */}
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

/* ─── loading skeleton ─── */
function UsersTableSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 last:border-0 last:pb-0">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex flex-col flex-1 gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full hidden sm:block" />
            <Skeleton className="h-5 w-24 rounded-full hidden sm:block" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/* ─── main component ─── */
export default function AdminUsers() {
  const [pageIndex, setPageIndex] = useState(0)
  const [pageCursors, setPageCursors] = useState([null])
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const limit = 50

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim())
      setPageIndex(0)
      setPageCursors([null])
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const currentCursor = pageCursors[pageIndex]
  const params = new URLSearchParams({ limit: String(limit) })
  if (currentCursor) params.set('cursor', currentCursor)
  if (searchQuery) params.set('q', searchQuery)

  const { data: usersData, isLoading: loading, mutate } = useSWR(`/admin/users?${params.toString()}`, fetcher)
  const users = usersData?.items || []
  const usersById = useMemo(() => new Map(users.map(user => [user.id, user])), [users])
  const totalUsers = usersData?.total || 0
  const pendingUsers = usersData?.pending_count || 0
  const aspirantsCount = usersData?.aspirants_count || 0

  const [updating, setUpdating] = useState({})
  const [resetLink, setResetLink] = useState(null)

  const load = useCallback(() => mutate(), [mutate])

  const changeRole = useCallback(async (userId, role) => {
    const oldRole = usersById.get(userId)?.role
    setUpdating(u => ({ ...u, [userId]: true }))
    try {
      await adminAPI.updateRole(userId, role)

      let newPending = pendingUsers
      let newAspirants = aspirantsCount
      if (oldRole === 'user' && role === 'aspirant') { newPending--; newAspirants++; }
      if (oldRole === 'aspirant' && role === 'user') { newPending++; newAspirants--; }

      mutate({
        ...usersData,
        items: users.map(u => u.id === userId ? { ...u, role } : u),
        pending_count: newPending,
        aspirants_count: newAspirants
      }, false)
      toast.success(`Role updated to ${role}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally {
      setUpdating(u => ({ ...u, [userId]: false }))
    }
  }, [usersById, pendingUsers, aspirantsCount, usersData, users, mutate])

  const toggleStatus = useCallback(async (userId) => {
    setUpdating(u => ({ ...u, [userId]: true }))
    try {
      await adminAPI.toggleStatus(userId)
      mutate({ ...usersData, items: users.map(u => u.id === userId ? { ...u, is_active: !u.is_active } : u) }, false)
      toast.success('Status updated')
    } catch {
      toast.error('Failed')
    } finally {
      setUpdating(u => ({ ...u, [userId]: false }))
    }
  }, [usersData, users, mutate])

  const createResetLink = useCallback(async (userId) => {
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
  }, [])

  const copyResetLink = useCallback(async () => {
    if (!resetLink?.reset_url) return
    try {
      await navigator.clipboard.writeText(resetLink.reset_url)
      toast.success('Reset link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }, [resetLink])

  const goToPreviousPage = () => setPageIndex(i => Math.max(0, i - 1))
  const goToNextPage = () => {
    if (!usersData?.next_cursor) return
    setPageCursors(cursors => [
      ...cursors.slice(0, pageIndex + 1),
      usersData.next_cursor,
    ])
    setPageIndex(i => i + 1)
  }
  const showingFrom = totalUsers === 0 ? 0 : pageIndex * limit + 1
  const showingTo = Math.min(pageIndex * limit + users.length, totalUsers)
  const hasPagination = totalUsers > limit

  const TABLE_HEADERS = ['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions']

  return (
    <Layout>
      <div className="flex flex-col gap-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Users</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{totalUsers} registered · {pendingUsers} pending approval</p>
          </div>
          <Button variant="ghost" size="sm" onClick={load}>
            <RefreshCw size={15} /> Refresh
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search all users by name or email..."
            className="pl-10 h-10"
          />
        </div>

        {loading ? (
          <UsersTableSkeleton />
        ) : (
          <>
            {/* Desktop table */}
            <Card className="overflow-hidden hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200 dark:border-slate-800 hover:bg-transparent">
                    {TABLE_HEADERS.map(h => (
                      <TableHead key={h} className="px-5 py-3.5 text-xs uppercase tracking-wider font-medium text-slate-500 dark:text-slate-400">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <UserRow
                      key={u.id}
                      user={u}
                      updating={updating}
                      onChangeRole={changeRole}
                      onToggleStatus={toggleStatus}
                      onCreateResetLink={createResetLink}
                    />
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No users found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {hasPagination && (
                <div className="flex justify-between items-center px-5 py-4 border-t border-slate-200 dark:border-slate-800">
                  <Button variant="ghost" size="sm" onClick={goToPreviousPage} disabled={pageIndex === 0}>Previous</Button>
                  <span className="text-sm text-slate-500">Showing {showingFrom} – {showingTo} of {totalUsers}</span>
                  <Button variant="ghost" size="sm" onClick={goToNextPage} disabled={!usersData?.has_more}>Next</Button>
                </div>
              )}
            </Card>

            {/* Mobile card view */}
            <div className="flex flex-col gap-3 md:hidden">
              {users.map(u => (
                <UserMobileCard
                  key={u.id}
                  user={u}
                  updating={updating}
                  onChangeRole={changeRole}
                  onToggleStatus={toggleStatus}
                  onCreateResetLink={createResetLink}
                />
              ))}
              {users.length === 0 && (
                <p className="text-center py-12 text-muted-foreground">No users found</p>
              )}
              {hasPagination && (
                <Card>
                  <CardContent className="flex justify-between items-center gap-3 p-3">
                    <Button variant="ghost" size="sm" onClick={goToPreviousPage} disabled={pageIndex === 0}>Previous</Button>
                    <span className="text-sm text-slate-500">Showing {showingFrom} – {showingTo} of {totalUsers}</span>
                    <Button variant="ghost" size="sm" onClick={goToNextPage} disabled={!usersData?.has_more}>Next</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}

        {/* Password Reset Dialog */}
        <Dialog open={!!resetLink} onOpenChange={(open) => !open && setResetLink(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Password Reset Link</DialogTitle>
              <DialogDescription>{resetLink?.full_name} · {resetLink?.email}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">Reset Link</label>
              <Input
                value={resetLink?.reset_url || ''}
                readOnly
                className="font-mono text-xs"
                aria-label="Password reset link"
              />
              <p className="text-xs text-muted-foreground">
                Expires {resetLink && new Date(resetLink.expires_at).toLocaleString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Close</Button>
              </DialogClose>
              <Button onClick={copyResetLink}>
                <Copy size={15} /> Copy Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  )
}
