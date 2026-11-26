import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { getApiErrorDetail } from '@/lib/apiError'
import {
  exitFullscreenBestEffort,
  requestFullscreenBestEffort,
  type FullscreenRequestOutcome,
} from '@/utils/fullscreen'
import { adminAPI, testAPI } from '../api/api'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { AttemptStart, TestQuestion } from '@/types/api'

export interface AttemptLifecycleParams {
  testId: string | number | undefined
  isPreview: boolean
  navigate: (to: string) => void
  attemptRef: RefObject<AttemptStart | PreviewAttempt | null>
  questionsRef: RefObject<TestQuestion[]>
  answersRef: RefObject<Record<number, string | undefined>>
  timingsRef: RefObject<Record<number, number>>
  loadedRef: RefObject<boolean>
  setQuestions: Dispatch<SetStateAction<TestQuestion[]>>
  setAnswers: Dispatch<SetStateAction<Record<number, string | undefined>>>
  setTimings: Dispatch<SetStateAction<Record<number, number>>>
  setMarked: Dispatch<SetStateAction<Set<number>>>
  setVisited: Dispatch<SetStateAction<Set<number>>>
  setCurrent: Dispatch<SetStateAction<number>>
  setNatInput: (value: string) => void
  setTabViolations: Dispatch<SetStateAction<number>>
  setFsViolations: Dispatch<SetStateAction<number>>
  setShowFsWarning: Dispatch<SetStateAction<boolean>>
  tabViolRef: RefObject<number>
  fsViolRef: RefObject<number>
  setStarted: Dispatch<SetStateAction<boolean>>
}
interface PreviewAttempt {
  id: string
  attempt_number: string
  max_attempts: string
  started_at: string
  server_time: string
  answers?: AttemptStart['answers']
  tab_violations?: number
  fullscreen_violations?: number
}
export type LifecycleAttempt = AttemptStart | PreviewAttempt
export interface AttemptLifecycleResult {
  attempt: LifecycleAttempt | null
  attemptNumber: number | string | null
  maxAttempts: number | string
  starting: boolean
  accepted: boolean
  fullscreenUnavailable: boolean
  setAccepted: Dispatch<SetStateAction<boolean>>
  beginTest: () => Promise<void>
}
export default function useAttemptLifecycle({
  testId,
  isPreview,
  navigate,
  attemptRef,
  questionsRef,
  answersRef,
  timingsRef,
  loadedRef,
  setQuestions,
  setAnswers,
  setTimings,
  setMarked,
  setVisited,
  setCurrent,
  setNatInput,
  setTabViolations,
  setFsViolations,
  setShowFsWarning,
  tabViolRef,
  fsViolRef,
  setStarted,
}: AttemptLifecycleParams): AttemptLifecycleResult {
  const [attempt, setAttempt] = useState<LifecycleAttempt | null>(null)
  const [attemptNumber, setAttemptNumber] = useState<number | string | null>(null)
  const [maxAttempts, setMaxAttempts] = useState<number | string>(6)
  const [starting, setStarting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [fullscreenUnavailable, setFullscreenUnavailable] = useState(false)
  const mountedRef = useRef(true)
  const loadedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (loadedTimerRef.current !== null) {
        clearTimeout(loadedTimerRef.current)
        loadedTimerRef.current = null
      }
    }
  }, [])

  const beginTest = useCallback(async () => {
    if (testId === undefined || testId === null || testId === '') {
      toast.error('Test identifier is required')
      navigate('/tests')
      return
    }

    if (!accepted || starting) return

    setStarting(true)
    setFullscreenUnavailable(false)
    loadedRef.current = false
    if (loadedTimerRef.current !== null) {
      clearTimeout(loadedTimerRef.current)
      loadedTimerRef.current = null
    }

    let aborted = false
    let examStarted = false
    const fullscreenState: { outcome: FullscreenRequestOutcome | 'pending' } = {
      outcome: 'pending',
    }

    try {
      requestFullscreenBestEffort({
        onSettled: (outcome) => {
          fullscreenState.outcome = outcome
          if (aborted || !mountedRef.current) {
            if (outcome === 'entered') {
              exitFullscreenBestEffort()
            }
            return
          }
          if (outcome === 'entered') {
            setFullscreenUnavailable(false)
          } else if (examStarted) {
            setFullscreenUnavailable(true)
          }
        },
      })

      let attemptData
      let qData

      if (isPreview) {
        attemptData = {
          id: 'preview',
          attempt_number: 'Preview',
          max_attempts: '∞',
          started_at: new Date().toISOString(),
          server_time: new Date().toISOString(),
        }
        const qRes = await adminAPI.getQuestions(testId)
        qData = qRes.data
      } else {
        const attemptRes = await testAPI.startTest(testId)
        attemptData = attemptRes.data
        const qRes = await testAPI.getQuestions(testId, attemptData.id)
        qData = qRes.data
      }

      if (!mountedRef.current) {
        if (fullscreenState.outcome === 'entered') {
          exitFullscreenBestEffort()
        }
        return
      }

      setAttempt(attemptData)
      attemptRef.current = attemptData
      setAttemptNumber(attemptData.attempt_number || 1)
      setMaxAttempts(attemptData.max_attempts || 6)

      const restoredAnswers: Record<number, string | undefined> = Object.fromEntries(
        (attemptData.answers || [])
          .filter(answer => answer.selected_answer)
          .map(answer => [answer.question_id, answer.selected_answer ?? undefined])
      )
      const restoredTimings = Object.fromEntries(
        (attemptData.answers || []).map(answer => [
          answer.question_id,
          answer.time_spent_seconds || 0,
        ])
      )

      setQuestions(qData)
      questionsRef.current = qData
      setVisited(new Set([
        ...(qData[0] ? [qData[0].id] : []),
        ...Object.keys(restoredAnswers).map(Number),
      ]))
      setAnswers(restoredAnswers)
      setTimings(restoredTimings)
      setMarked(new Set())
      setCurrent(0)
      setNatInput('')
      setTabViolations(attemptData.tab_violations || 0)
      setFsViolations(attemptData.fullscreen_violations || 0)
      setShowFsWarning(false)
      tabViolRef.current = attemptData.tab_violations || 0
      fsViolRef.current = attemptData.fullscreen_violations || 0
      answersRef.current = restoredAnswers
      timingsRef.current = restoredTimings
      examStarted = true
      setStarted(true)

      if (
        fullscreenState.outcome === 'unsupported' ||
        fullscreenState.outcome === 'blocked'
      ) {
        setFullscreenUnavailable(true)
      }

      loadedTimerRef.current = setTimeout(() => {
        loadedTimerRef.current = null
        if (!mountedRef.current) return
        loadedRef.current = true
        if (!document.fullscreenElement) {
          if (fullscreenState.outcome === 'entered') {
            setShowFsWarning(true)
          } else {
            setFullscreenUnavailable(true)
          }
        }
      }, 2000)
    } catch (err) {
      aborted = true
      exitFullscreenBestEffort()
      if (mountedRef.current) {
        setFullscreenUnavailable(false)
      }
      console.error('TestEngine beginTest error:', err)
      toast.error(getApiErrorDetail(err) || 'Failed to start test')
      navigate('/tests')
    } finally {
      setStarting(false)
    }
  }, [
    accepted,
    navigate,
    starting,
    testId,
    isPreview,
    attemptRef,
    questionsRef,
    answersRef,
    timingsRef,
    loadedRef,
    setQuestions,
    setAnswers,
    setTimings,
    setMarked,
    setVisited,
    setCurrent,
    setNatInput,
    setTabViolations,
    setFsViolations,
    setShowFsWarning,
    tabViolRef,
    fsViolRef,
    setStarted,
  ])

  return {
    attempt,
    attemptNumber,
    maxAttempts,
    starting,
    accepted,
    fullscreenUnavailable,
    setAccepted,
    beginTest,
  }
}
