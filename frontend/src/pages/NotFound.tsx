import type { ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Compass } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/shared/Layout'
import Logo from '../components/shared/Logo'
import ThemeToggle from '../components/shared/ThemeToggle'
import { PageLoader } from '../components/shared/Spinner'
import { getAuthenticatedHome } from '../components/shared/ProtectedRoute'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface BackTarget {
  to: string
  label: string
}

function getBackTarget(role: string | undefined): BackTarget {
  if (!role) return { to: '/login', label: 'Back to Sign in' }
  const to = getAuthenticatedHome(role)
  if (role === 'admin' || role === 'aspirant') {
    return { to, label: 'Back to Dashboard' }
  }
  return { to, label: 'Back to Approval Status' }
}

/** Styled 404 page with session-aware navigation back to the user's home route. */
export default function NotFoundPage(): ReactElement {
  const { user, loading } = useAuth()

  if (loading) {
    return <PageLoader />
  }

  const target = getBackTarget(user?.role)
  const hasAppNav = Boolean(user && ['admin', 'aspirant'].includes(user.role))

  const content = (
    <div className="flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md border-border text-center animate-slide-up">
        <CardContent className="p-8 flex flex-col items-center gap-4">
          <div className="size-14 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
            <Compass size={26} aria-hidden="true" />
          </div>
          <span className="font-mono text-xs font-semibold tracking-widest uppercase px-2.5 py-1 rounded-md bg-muted text-muted-foreground border border-border">
            404 · Not Found
          </span>
          <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The route you requested does not exist or may have moved.
          </p>
          <Button asChild className="mt-2 w-full sm:w-auto gap-2">
            <Link to={target.to}>
              <ArrowLeft size={16} aria-hidden="true" />
              {target.label}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  if (hasAppNav) {
    return <Layout>{content}</Layout>
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      <header className="flex items-center justify-between p-4 sm:px-6 border-b border-border bg-card/60 backdrop-blur-sm">
        <Link to={target.to} className="flex items-center gap-2">
          <Logo size="md" />
          <span className="font-bold text-lg text-foreground">GATEPrep</span>
        </Link>
        <ThemeToggle className="border border-border bg-card" />
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">{content}</div>
      </main>
    </div>
  )
}
