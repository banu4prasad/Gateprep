import type { ReactElement } from 'react'
import { AlertTriangle, ArrowLeft, FileQuestion, RotateCcw } from 'lucide-react'
import ThemeToggle from '../shared/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export interface TestNotFoundScreenProps {
  status?: 'not_found' | 'error'
  errorMessage?: string | null
  onRetry?: () => void
  onBack: () => void
}

/** Inline error and not-found view for `/tests/:id` with accessible contrast and back action. */
export default function TestNotFoundScreen({
  status = 'not_found',
  errorMessage,
  onRetry,
  onBack,
}: TestNotFoundScreenProps): ReactElement {
  const isError = status === 'error'

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      <header className="flex justify-end p-4">
        <ThemeToggle className="h-9 w-9 border border-border bg-card" />
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border text-center animate-fade-in">
          <CardContent className="p-6 pt-8 flex flex-col items-center">
            <div
              className={
                isError
                  ? 'size-12 rounded-2xl bg-[var(--destructive)]/10 border border-[var(--destructive)]/25 flex items-center justify-center mb-4 text-destructive'
                  : 'size-12 rounded-2xl bg-[var(--warning-text)]/10 border border-[var(--warning-text)]/25 flex items-center justify-center mb-4 text-warning-text'
              }
            >
              {isError
                ? <AlertTriangle size={24} aria-hidden="true" />
                : <FileQuestion size={24} aria-hidden="true" />}
            </div>
            <h1 className="text-xl font-bold mb-2 text-foreground">
              {isError ? 'Failed to load' : 'Test not found'}
            </h1>
            <p className="text-sm mb-6 text-muted-foreground leading-relaxed">
              {isError
                ? (errorMessage || 'Failed to load test')
                : 'The test you requested does not exist or is no longer available.'}
            </p>
            <div className="flex w-full gap-2">
              {isError && onRetry && (
                <Button onClick={onRetry} className="flex-1 gap-2">
                  <RotateCcw size={16} aria-hidden="true" />
                  Retry
                </Button>
              )}
              <Button
                variant={isError && onRetry ? 'outline' : 'default'}
                onClick={onBack}
                className={isError && onRetry ? 'flex-1 gap-2 text-foreground' : 'w-full gap-2'}
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
