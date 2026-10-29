import { useCallback, useEffect, useRef, useState } from 'react'

export default function useTestAnswerState({
  current,
  questions,
  currentQuestion,
  answersRef,
  timingsRef,
}) {
  const [answers, setAnswers] = useState({})
  const [timings, setTimings] = useState({})
  const [marked, setMarked] = useState(new Set())
  const [visited, setVisited] = useState(new Set())
  const [natInput, setNatInputState] = useState('')
  const natInputRef = useRef('')
  const setNatInput = useCallback((value) => {
    natInputRef.current = value
    setNatInputState(value)
  }, [])

  const updateNatInput = useCallback((value) => {
    setNatInput(value)

    const question = questions[current]
    if (!question || question.question_type !== 'nat') return

    const updated = { ...answersRef.current }
    if (value.trim()) updated[question.id] = value.trim()
    else delete updated[question.id]
    answersRef.current = updated
    setAnswers(updated)
  }, [answersRef, current, questions, setNatInput])

  const questionStartRef = useRef(Date.now())

  // Per-question elapsed timing effect
  useEffect(() => {
    const q = questions[current]
    if (!q) return
    questionStartRef.current = Date.now()
    return () => {
      const elapsed = Math.floor((Date.now() - questionStartRef.current) / 1000)
      if (elapsed > 0) {
        setTimings(t => {
          const updated = { ...t, [q.id]: (t[q.id] || 0) + elapsed }
          timingsRef.current = updated
          return updated
        })
      }
    }
  }, [current, questions, timingsRef])

  // Visited tracking effect
  useEffect(() => {
    const q = questions[current]
    if (q) setVisited(v => new Set([...v, q.id]))
  }, [current, questions])

  // NAT input sync effect
  useEffect(() => {
    const q = questions[current]
    if (q?.question_type === 'nat') {
      const value = answers[q.id] || ''
      setNatInput(value)
    }
  }, [current, questions, answers, setNatInput])

  const setMCQ = useCallback((letter) => {
    if (!currentQuestion) return
    setAnswers(a => {
      const updated = { ...a, [currentQuestion.id]: a[currentQuestion.id] === letter ? undefined : letter }
      answersRef.current = updated
      return updated
    })
  }, [currentQuestion, answersRef])

  const toggleMSQ = useCallback((letter) => {
    if (!currentQuestion) return
    setAnswers(a => {
      const cur = (a[currentQuestion.id] || '').split(',').filter(Boolean)
      const next = cur.includes(letter) ? cur.filter(l => l !== letter) : [...cur, letter].sort()
      const updated = { ...a, [currentQuestion.id]: next.join(',') || undefined }
      answersRef.current = updated
      return updated
    })
  }, [currentQuestion, answersRef])

  const commitNAT = useCallback(() => {
    if (!currentQuestion) return
    const value = natInputRef.current.trim()
    const updated = { ...answersRef.current }
    if (value) updated[currentQuestion.id] = value
    else delete updated[currentQuestion.id]
    answersRef.current = updated
    setAnswers(updated)
  }, [currentQuestion, answersRef])

  const clearResponse = useCallback(() => {
    if (!currentQuestion) return
    setAnswers(a => {
      const n = { ...a }
      delete n[currentQuestion.id]
      answersRef.current = n
      return n
    })
    setNatInput('')
  }, [currentQuestion, answersRef])

  return {
    answers,
    setAnswers,
    timings,
    setTimings,
    marked,
    setMarked,
    visited,
    setVisited,
    natInput,
    setNatInput,
    updateNatInput,
    setMCQ,
    toggleMSQ,
    commitNAT,
    clearResponse,
    questionStartRef,
  }
}
