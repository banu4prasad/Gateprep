import { useEffect, useRef } from 'react'
import { AlertTriangle, Maximize } from 'lucide-react'
import TimerDisplay from './TimerDisplay'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { requestFullscreenBestEffort } from '@/utils/fullscreen'

const FULLSCREEN_RETRY_FALLBACK_MS = 1000

export interface FullscreenWarningProps {
  endTimeMs: number | null
  fsViolations: number
  handleTimerExpire: () => void
  setShowConfirm: React.Dispatch<React.SetStateAction<boolean>>
  setShowFsWarning: React.Dispatch<React.SetStateAction<boolean>>
}

export default function FullscreenWarning({
  endTimeMs,
  fsViolations,
  handleTimerExpire,
  setShowConfirm,
  setShowFsWarning,
}: FullscreenWarningProps): React.ReactElement {
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current !== null) {
        clearTimeout(fallbackTimerRef.current)
        fallbackTimerRef.current = null
      }
    }
  }, [])

  const clearFallbackTimer = () => {
    if (fallbackTimerRef.current !== null) {
      clearTimeout(fallbackTimerRef.current)
      fallbackTimerRef.current = null
    }
  }

  const handleReturnToFullscreen = () => {
    clearFallbackTimer()
    let settled = false
    const initiated = requestFullscreenBestEffort({
      onSettled: () => {
        settled = true
        clearFallbackTimer()
        setShowFsWarning(false)
      },
    })
    if (initiated && !settled) {
      fallbackTimerRef.current = setTimeout(() => {
        fallbackTimerRef.current = null
        setShowFsWarning(false)
      }, FULLSCREEN_RETRY_FALLBACK_MS)
    }
  }

  return (
    <Dialog open={true}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={e => e.preventDefault()}
        onPointerDownOutside={e => e.preventDefault()}
        onInteractOutside={e => e.preventDefault()}
        className="text-center p-8 sm:max-w-sm border border-destructive/40"
      >
        <AlertTriangle size={44} className="text-destructive mx-auto" />
        <DialogTitle className="text-xl font-bold">You exited fullscreen!</DialogTitle>
        <DialogDescription asChild>
          <div>
            <p className="text-sm text-muted-foreground">The timer is still running.</p>
            <p className="text-destructive font-semibold mt-1">Violation {fsViolations}/3</p>
            <p className="text-xs text-muted-foreground mt-1">3 violations = test auto-submitted</p>
          </div>
        </DialogDescription>
        <TimerDisplay
          endTime={endTimeMs}
          onExpire={handleTimerExpire}
          announceWarnings={false}
          className="text-3xl font-mono font-bold"
          lowClassName="text-destructive timer-critical"
          normalClassName="text-foreground"
        />
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleReturnToFullscreen}
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
      </DialogContent>
    </Dialog>
  )
}
