import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { CheckCircle2, Hash, ListChecks } from 'lucide-react'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import { Card, CardContent } from '../ui/card'

const FEATURE_CARDS: ReadonlyArray<[string, string, ReactElement]> = [
  ['MCQ', 'Single correct', <CheckCircle2 key="mcq" size={16} aria-hidden="true" />],
  ['MSQ', 'Multi-select', <ListChecks key="msq" size={16} aria-hidden="true" />],
  ['NAT', 'Numerical', <Hash key="nat" size={16} aria-hidden="true" />],
]

export interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}

/** Shared split-column auth layout with theme toggle and standardized card container. */
export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps): ReactElement {
  const cardStyle: CSSProperties & { [key: `--${string}`]: string } = { '--card-spacing': '1.5rem' }

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-200">
      {/* Left branding panel */}
      <aside className="hidden lg:flex flex-col justify-between w-5/12 p-12 bg-[var(--header-bg)] border-r border-border transition-colors duration-200">
        <div className="flex items-center gap-3">
          <Logo size="lg" />
          <span className="font-bold text-foreground text-xl">GATEPrep</span>
        </div>
        <div>
          <p className="font-heading text-4xl font-bold text-foreground leading-tight mb-4">
            Crack GATE with<br />
            <span className="text-primary">precision practice.</span>
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Practice MCQ, MSQ, and NAT questions with exam-grade timing and analytics.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {FEATURE_CARDS.map(([label, desc, icon]) => (
            <div
              key={label}
              className="p-4 rounded-lg border border-border bg-card hover:bg-muted flex flex-col items-start transition-colors duration-200 shadow-sm hover:shadow"
            >
              <div className="text-primary mb-2">{icon}</div>
              <p className="font-bold text-primary">{label}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </aside>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col p-6">
        <header className="flex items-center justify-between lg:justify-end mb-6 lg:mb-0">
          <div className="flex items-center gap-2 lg:hidden">
            <Logo size="md" />
            <span className="font-bold text-lg text-foreground">GATEPrep</span>
          </div>
          <ThemeToggle className="border border-border bg-card" />
        </header>

        <main className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md animate-slide-up">
            <p className="lg:hidden font-heading text-2xl font-bold leading-tight text-foreground mb-6">
              Crack GATE with <span className="text-primary">precision practice.</span>
            </p>

            <h1 className="text-2xl font-bold mb-1 text-foreground">{title}</h1>
            <p className="text-sm mb-6 text-muted-foreground">{subtitle}</p>

            <Card className="border-border shadow-sm" style={cardStyle}>
              <CardContent>{children}</CardContent>
            </Card>

            {footer}
          </div>
        </main>
      </div>
    </div>
  )
}
