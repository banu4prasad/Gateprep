import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { getApiErrorDetail } from '@/lib/apiError'
import { exitFullscreenBestEffort } from '@/utils/fullscreen'
import { testAPI } from '../api/api'
import type { RefObject } from 'react'
import type { TestQuestion } from '@/types/api'
type AttemptRefValue = { id: string | number }

export interface TestSubmissionParams {
  isPreview: boolean
  navigate: (to: string, options?: { state?: unknown }) => void
  attemptRef: RefObject<AttemptRefValue | null>
  answersRef: RefObject<Record<number, string | undefined>>
  questionsRef: RefObject<TestQuestion[]>
  timingsRef: RefObject<Record<number, number>>
  testIdRef: RefObject<string | number | undefined>
  autoSaveRef: RefObject<ReturnType<typeof setInterval> | null>
  commitNAT: () => void
}
export interface TestSubmissionResult {
  submitting: boolean
  showConfirm: boolean
  setShowConfirm: React.Dispatch<React.SetStateAction<boolean>>
  submitLockRef: RefObject<boolean>
  doSubmit: (auto?: boolean) => void
  doSubmitRef: RefObject<(auto?: boolean) => Promise<void>>
  handleTimerExpire: () => void
}
export default function useTestSubmission({
  isPreview,
  navigate,
  attemptRef,
  answersRef,
  questionsRef,
  timingsRef,
  testIdRef,
  autoSaveRef,
  commitNAT,
}: TestSubmissionParams): TestSubmissionResult {
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const submitLockRef = useRef<boolean>(false)

  const doSubmitCore = useCallback(async (auto = false) => {
    if (submitLockRef.current) return
    submitLockRef.current = true
    setSubmitting(true)
    if (autoSaveRef.current) clearInterval(autoSaveRef.current)

    exitFullscreenBestEffort()

    if (isPreview) {
      if (auto) toast('Time up! Auto-submitted preview.', { duration: 5000 })
      else toast.success('Preview submitted successfully! (No data saved)')
      submitLockRef.current = false
      setSubmitting(false)
      navigate(`/admin/tests/${testIdRef.current}`)
      return
    }

    commitNAT()

    const currentAttempt = attemptRef.current
    const currentAnswers = answersRef.current
    const currentQuestions = questionsRef.current
    const currentTimings = timingsRef.current

    if (!currentAttempt) {
      submitLockRef.current = false
      setSubmitting(false)
      return
    }

    const currentTestId = testIdRef.current
    if (currentTestId === undefined || currentTestId === null || currentTestId === '') {
      submitLockRef.current = false
      setSubmitting(false)
      toast.error('Unable to submit test: test identifier is required')
      return
    }

    try {
      const ans = currentQuestions.map(q => ({
        question_id: q.id,
        selected_answer: currentAnswers[q.id] || null,
        time_spent_seconds: currentTimings[q.id] || 0,
      }))
      const res = await testAPI.submitTest(currentTestId, currentAttempt.id, ans)
      if (auto) toast('Time up! Auto-submitted.', { duration: 5000 })
      else toast.success('Test submitted successfully!')

      if (res.data?.persisted === false && res.data?.result) {
        const result = res.data.result
        const resultId = result.client_result_id || result.attempt_id || res.data.id
        sessionStorage.setItem(`practice-result:${resultId}`, JSON.stringify(result))
        navigate(`/results/${resultId}`, { state: { result } })
        return
      }

      navigate(`/results/${res.data.id}`)
    } catch (err) {
      toast.error(getApiErrorDetail(err) || 'Submit failed. Please try again.')
      submitLockRef.current = false
      setSubmitting(false)
    }
  }, [isPreview, navigate, attemptRef, answersRef, questionsRef, timingsRef, testIdRef, autoSaveRef, commitNAT])

  const doSubmitRef = useRef<(auto?: boolean) => Promise<void>>(doSubmitCore)
  useEffect(() => { doSubmitRef.current = doSubmitCore }, [doSubmitCore])

  const doSubmit = useCallback((auto = false) => doSubmitRef.current(auto), [])
  const handleTimerExpire = useCallback(() => {
    doSubmitRef.current(true)
  }, [])

  return {
    submitting,
    showConfirm,
    setShowConfirm,
    submitLockRef,
    doSubmit,
    doSubmitRef,
    handleTimerExpire,
  }
}
