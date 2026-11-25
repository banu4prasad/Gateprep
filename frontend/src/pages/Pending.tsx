import type { CSSProperties } from 'react'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/shared/ThemeToggle'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Clock, LogOut } from 'lucide-react'

export default function PendingPage() {
  const { user, logout } = useAuth()
  const cardStyle: CSSProperties & { [key: `--${string}`]: string } = { '--card-spacing': '1.5rem' }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground transition-colors duration-200 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle className="border border-border bg-card" />
      </div>
      <Card
        className="w-full max-w-md animate-slide-up border-border shadow-sm text-center"
        style={cardStyle}
      >
        <CardContent>
          <div className="flex flex-col items-center">
            <div className="size-16 rounded-2xl bg-[var(--warning-text)]/10 border border-[var(--warning-text)]/20 flex items-center justify-center mb-6">
              <Clock size={28} className="text-warning-text" />
            </div>
            <h1 className="text-2xl font-bold mb-3 text-card-foreground">Awaiting Approval</h1>
            <p className="leading-relaxed mb-2 text-muted-foreground">
              Hey <span className="text-foreground">{user?.full_name}</span>, your account is pending admin approval.
            </p>
            <p className="text-sm mb-8 text-muted-foreground">
              Once approved as an aspirant, you&apos;ll be able to access all tests.
            </p>
            <Button onClick={logout} variant="outline" className="gap-2 rounded-md bg-[var(--bg-panel)] text-foreground shadow-sm hover:bg-[var(--bg-panel)]/90">
              <LogOut size={16} /> Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
