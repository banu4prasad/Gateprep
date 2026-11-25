import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/shared/Logo'
import ThemeToggle from '../components/shared/ThemeToggle'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

export default function ForgotPasswordPage() {
  const cardStyle: CSSProperties & { [key: `--${string}`]: string } = { '--card-spacing': '1.5rem' }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground transition-colors duration-200">
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between gap-2 mb-8">
          <div className="flex items-center gap-2">
            <Logo size="md" />
            <span className="font-bold text-lg text-foreground">GATEPrep</span>
          </div>
          <ThemeToggle className="border border-border bg-card" />
        </div>

        <h1 className="text-2xl font-bold mb-6 text-foreground">Account recovery</h1>

        <Card className="border-border shadow-sm" style={cardStyle}>
          <CardContent>
            <div className="flex items-start gap-4">
              <div className="size-10 rounded bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                <ShieldCheck size={18} className="text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-base text-card-foreground">Admin-assisted reset</h2>
                <p className="text-sm mt-1 leading-relaxed text-muted-foreground">
                  Contact administrator to receive a secure reset link.
                </p>
              </div>
            </div>

            <Button
              asChild
              variant="outline"
              className="w-full mt-6 gap-2 rounded-md border-border bg-[var(--bg-panel)] text-foreground shadow-sm hover:bg-[var(--bg-panel)]/90"
            >
              <Link to="/login">
                <ArrowLeft size={15} /> Back to sign in
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
