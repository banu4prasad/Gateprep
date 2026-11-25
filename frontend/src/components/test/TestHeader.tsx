import { Calculator as CalcIcon, Send } from 'lucide-react'
import clsx from 'clsx'
import Logo from '../shared/Logo'
import Spinner from '../shared/Spinner'
import ThemeToggle from '../shared/ThemeToggle'
import TimerDisplay from './TimerDisplay'
import type { TestDetail } from '@/types/api'

export interface TestHeaderProps {
  attemptNumber: number | string | null
  endTimeMs: number | null
  handleTimerExpire: () => void
  maxAttempts: number | string
  onSubmitClick: () => void
  setShowCalc: React.Dispatch<React.SetStateAction<boolean>>
  showCalc: boolean
  submitting: boolean
  test: TestDetail | null
  totalViolations: number
}

export default function TestHeader({
  attemptNumber,
  endTimeMs,
  handleTimerExpire,
  maxAttempts,
  onSubmitClick,
  setShowCalc,
  showCalc,
  submitting,
  test,
  totalViolations,
}: TestHeaderProps): React.ReactElement {
  return (
    <div className="app-header flex items-center justify-between px-2 sm:px-4 h-12 border-b flex-shrink-0 theme-header-surface">
      <div className="flex items-center gap-2 mr-3 flex-shrink-0">
        <Logo size="xs" />
        <span className="text-foreground text-sm font-semibold truncate max-w-[200px] sm:max-w-xs md:max-w-md">
          {test?.title}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {attemptNumber && (
          <span className="text-xs font-medium hidden sm:block theme-header-muted">
            Attempt {attemptNumber}/{maxAttempts}
          </span>
        )}

        {totalViolations > 0 && (
          <span className="text-xs font-medium text-destructive hidden sm:block">
            {totalViolations}/3 Violations
          </span>
        )}

        <ThemeToggle className="h-9 w-9 border theme-border" />

        <button
          type="button"
          onClick={() => setShowCalc(s => !s)}
          aria-label="Calculator"
          title="Calculator"
          className={clsx(
            'flex items-center justify-center h-9 w-9 rounded-md border transition-colors duration-200',
            showCalc
              ? 'bg-primary border-primary text-primary-foreground'
              : 'theme-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
          )}
        >
          <CalcIcon size={16} />
        </button>

        <TimerDisplay endTime={endTimeMs} onExpire={handleTimerExpire} />

        <button
          type="button"
          onClick={onSubmitClick}
          disabled={submitting}
          className="flex items-center gap-1 px-3 py-1 rounded bg-primary hover:bg-[var(--primary-hover)] text-primary-foreground text-xs font-medium transition-colors duration-200 disabled:bg-[var(--btn-disabled-bg)] disabled:text-[var(--btn-disabled-fg)] disabled:opacity-100"
        >
          {submitting ? <Spinner size={12} /> : <Send size={12} />} Submit
        </button>
      </div>
    </div>
  )
}
