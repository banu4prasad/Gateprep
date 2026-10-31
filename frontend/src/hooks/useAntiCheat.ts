import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { testAPI } from '../api/api'

export default function useAntiCheat({
  attemptRef,
  doSubmitRef,
  fsViolRef,
  isPreview,
  loadedRef,
  setFsViolations,
  setShowFsWarning,
  setTabViolations,
  tabViolRef,
  testIdRef,
}) {
  const fullscreenExitTimeoutRef = useRef(null)

  useEffect(() => {
    const recordFullscreenViolation = () => {
      fullscreenExitTimeoutRef.current = null
      const next = fsViolRef.current + 1
      fsViolRef.current = next
      setFsViolations(next)

      if (next >= 3) {
        toast.error('3 fullscreen violations - auto submitting!')
        doSubmitRef.current(true)
        return
      }

      setShowFsWarning(true)
      if (!isPreview) {
        testAPI.updateViolations(testIdRef.current, attemptRef.current?.id, {
          fullscreen_violations: next,
        }).catch(() => {})
      }
    }

    const handleFsChange = () => {
      if (document.fullscreenElement || !loadedRef.current) return

      window.clearTimeout(fullscreenExitTimeoutRef.current)
      fullscreenExitTimeoutRef.current = window.setTimeout(recordFullscreenViolation, 250)
    }

    document.addEventListener('fullscreenchange', handleFsChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange)
      window.clearTimeout(fullscreenExitTimeoutRef.current)
    }
  }, [attemptRef, doSubmitRef, fsViolRef, isPreview, loadedRef, setFsViolations, setShowFsWarning, testIdRef])

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden || !loadedRef.current) return

      window.clearTimeout(fullscreenExitTimeoutRef.current)

      const next = tabViolRef.current + 1
      tabViolRef.current = next
      setTabViolations(next)

      if (next >= 3) {
        toast.error('3 tab violations - auto submitting!')
        doSubmitRef.current(true)
        return
      }

      toast(`Tab switch detected! Warning ${next}/3`, { duration: 3000 })
      if (!isPreview) {
        testAPI.updateViolations(testIdRef.current, attemptRef.current?.id, {
          tab_violations: next,
        }).catch(() => {})
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [attemptRef, doSubmitRef, isPreview, loadedRef, setTabViolations, tabViolRef, testIdRef])

  useEffect(() => {
    if (isPreview) return

    const warnBeforeUnload = event => {
      if (!attemptRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [attemptRef, isPreview])

  useEffect(() => {
    const prevent = event => event.preventDefault()
    const preventKeys = event => {
      if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'a', 'u'].includes(event.key.toLowerCase())) {
        event.preventDefault()
      }
    }

    document.addEventListener('contextmenu', prevent)
    document.addEventListener('copy', prevent)
    document.addEventListener('cut', prevent)
    document.addEventListener('paste', prevent)
    document.addEventListener('keydown', preventKeys)
    return () => {
      document.removeEventListener('contextmenu', prevent)
      document.removeEventListener('copy', prevent)
      document.removeEventListener('cut', prevent)
      document.removeEventListener('paste', prevent)
      document.removeEventListener('keydown', preventKeys)
    }
  }, [])
}
