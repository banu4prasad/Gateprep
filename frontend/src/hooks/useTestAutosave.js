import { useEffect, useRef } from 'react'
import { testAPI } from '../api/api'

export default function useTestAutosave({
  attempt,
  isPreview,
  answersRef,
  timingsRef,
  attemptRef,
  testIdRef,
}) {
  const autoSaveRef = useRef(null)

  useEffect(() => {
    if (!attempt || isPreview) return
    autoSaveRef.current = setInterval(() => {
      const ans = Object.entries(answersRef.current)
        .filter(([, selectedAnswer]) => typeof selectedAnswer === 'string' && selectedAnswer.trim())
        .map(([qid, sel]) => ({
          question_id: +qid,
          selected_answer: sel,
          time_spent_seconds: timingsRef.current[+qid] || 0,
        }))
      testAPI.saveAnswers(testIdRef.current, attemptRef.current?.id, ans).catch(() => {})
    }, 30000)
    return () => clearInterval(autoSaveRef.current)
  }, [attempt, isPreview, answersRef, timingsRef, attemptRef, testIdRef])

  return { autoSaveRef }
}
