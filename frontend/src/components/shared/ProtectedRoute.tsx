import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PageLoader } from './Spinner'

type RouteRole = 'admin' | 'aspirant'

interface RouteProps {
  children: React.ReactNode
  role?: RouteRole
}

/** Return the default authenticated landing route for a user role. */
export function getAuthenticatedHome(role: string): string {
  if (role === 'admin') return '/admin'
  if (role === 'aspirant') return '/dashboard'
  return '/pending'
}

export function ProtectedRoute({ children, role }: RouteProps) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (role === 'admin' && user.role !== 'admin') return <Navigate to="/dashboard" replace />
  if (role === 'aspirant' && !['admin', 'aspirant'].includes(user.role)) return <Navigate to="/pending" replace />
  return children
}

export function GuestRoute({ children }: Pick<RouteProps, 'children'>) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (user) {
    return <Navigate to={getAuthenticatedHome(user.role)} replace />
  }
  return children
}

/** Redirect root `/` directly to login or the authenticated user's home route. */
export function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={getAuthenticatedHome(user.role)} replace />
}
