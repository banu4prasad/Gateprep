import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import Maximize from 'lucide-react/dist/esm/icons/maximize'
import TimerDisplay from './TimerDisplay'

export default function FullscreenWarning({
  endTimeMs,
  fsViolations,
  handleTimerExpire,
  setShowConfirm,
  setShowFsWarning,
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center theme-danger-backdrop">
      <div className="text-center max-w-sm p-8 rounded-xl border border-red-500/40 theme-card-bg">
        <AlertTriangle size={44} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2 theme-text">You exited fullscreen!</h2>
        <p className="text-sm mb-1 theme-muted">The timer is still running.</p>
        <p className="text-red-400 font-semibold mb-1">Violation {fsViolations}/3</p>
        <p className="text-xs mb-5 theme-muted">3 violations = test auto-submitted</p>
        <TimerDisplay
          endTime={endTimeMs}
          onExpire={handleTimerExpire}
          announceWarnings={false}
          className="text-3xl font-mono font-bold mb-6"
          lowClassName="text-red-400 timer-critical"
          normalClassName="theme-text"
        />
        <div className="space-y-3">
          <button
            onClick={() => {
              document.documentElement.requestFullscreen?.()
                .then(() => setShowFsWarning(false))
                .catch(() => setShowFsWarning(false))
            }}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Maximize size={16} /> Return to Fullscreen
          </button>
          <button
            onClick={() => {
              setShowFsWarning(false)
              setShowConfirm(true)
            }}
            className="btn-danger w-full"
          >
            Submit Test Now
          </button>
        </div>
      </div>
    </div>
  )
}
