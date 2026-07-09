import Layout from '../components/shared/Layout'
import Search from 'lucide-react/dist/esm/icons/search'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import useAdminUsers from '../hooks/useAdminUsers'
import UserRow from '../components/admin/UserRow'
import UserMobileCard from '../components/admin/UserMobileCard'
import UsersTableSkeleton from '../components/admin/UsersTableSkeleton'
import UsersPagination from '../components/admin/UsersPagination'
import ResetLinkDialog from '../components/admin/ResetLinkDialog'

const TABLE_HEADERS = ['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions']

export default function AdminUsers() {
  const {
    pageIndex,
    users,
    loading,
    totalUsers,
    pendingUsers,
    searchInput,
    setSearchInput,
    updating,
    resetLink,
    setResetLink,
    reload,
    changeRole,
    toggleStatus,
    createResetLink,
    copyResetLink,
    goToPreviousPage,
    goToNextPage,
    showingFrom,
    showingTo,
    hasPagination,
    hasMore,
  } = useAdminUsers()

  return (
    <Layout>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Users</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{totalUsers} registered · {pendingUsers} pending approval</p>
          </div>
          <Button variant="ghost" size="sm" onClick={reload}>
            <RefreshCw size={15} /> Refresh
          </Button>
        </div>

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

              <UsersPagination
                pageIndex={pageIndex}
                showingFrom={showingFrom}
                showingTo={showingTo}
                totalUsers={totalUsers}
                hasPagination={hasPagination}
                hasMore={hasMore}
                onPrev={goToPreviousPage}
                onNext={goToNextPage}
              />
            </Card>

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
              <UsersPagination
                mobile
                pageIndex={pageIndex}
                showingFrom={showingFrom}
                showingTo={showingTo}
                totalUsers={totalUsers}
                hasPagination={hasPagination}
                hasMore={hasMore}
                onPrev={goToPreviousPage}
                onNext={goToNextPage}
              />
            </div>
          </>
        )}

        <ResetLinkDialog
          resetLink={resetLink}
          onClose={() => setResetLink(null)}
          onCopy={copyResetLink}
        />
      </div>
    </Layout>
  )
}
