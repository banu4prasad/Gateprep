import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import Maximize from 'lucide-react/dist/esm/icons/maximize'
import TimerDisplay from './TimerDisplay'
import { Button } from '@/components/ui/button'

export default function FullscreenWarning({
  endTimeMs,
  fsViolations,
  handleTimerExpire,
  setShowConfirm,
  setShowFsWarning,
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center theme-danger-backdrop">
      <div className="text-center max-w-sm p-8 rounded-xl border border-destructive/40 theme-card-bg">
        <AlertTriangle size={44} className="text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2 theme-text">You exited fullscreen!</h2>
        <p className="text-sm mb-1 theme-muted">The timer is still running.</p>
        <p className="text-destructive font-semibold mb-1">Violation {fsViolations}/3</p>
        <p className="text-xs mb-5 theme-muted">3 violations = test auto-submitted</p>
        <TimerDisplay
          endTime={endTimeMs}
          onExpire={handleTimerExpire}
          announceWarnings={false}
          className="text-3xl font-mono font-bold mb-6"
          lowClassName="text-destructive timer-critical"
          normalClassName="theme-text"
        />
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => {
              document.documentElement.requestFullscreen?.()
                .then(() => setShowFsWarning(false))
                .catch(() => setShowFsWarning(false))
            }}
            className="w-full flex items-center justify-center gap-2"
          >
            <Maximize size={16} /> Return to Fullscreen
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setShowFsWarning(false)
              setShowConfirm(true)
            }}
            className="w-full"
          >
            Submit Test Now
          </Button>
        </div>
      </div>
    </div>
  )
}
