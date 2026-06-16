import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { adminAPI, testAPI } from '../api/api'
import { getEndTimeMs } from '../utils/testEngineUtils'
import useAntiCheat from './useAntiCheat'

export default function useTestEngine() {
  const { testId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isPreview = searchParams.get('preview') === 'true'

  const [test, setTest] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [timings, setTimings] = useState({})
  const [marked, setMarked] = useState(new Set())
  const [visited, setVisited] = useState(new Set())
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showCalc, setShowCalc] = useState(false)
  const [natInput, setNatInput] = useState('')
  const [tabViolations, setTabViolations] = useState(0)
  const [fsViolations, setFsViolations] = useState(0)
  const [showFsWarning, setShowFsWarning] = useState(false)
  const [attemptNumber, setAttemptNumber] = useState(null)
  const [maxAttempts, setMaxAttempts] = useState(6)
  const [started, setStarted] = useState(false)
  const [starting, setStarting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [showPalette, setShowPalette] = useState(false)

  const submitLockRef = useRef(false)
  const autoSaveRef = useRef(null)
  const tabViolRef = useRef(0)
  const fsViolRef = useRef(0)
  const attemptRef = useRef(null)
  const answersRef = useRef({})
  const questionsRef = useRef([])
  const timingsRef = useRef({})
  const testIdRef = useRef(testId)
  const questionStartRef = useRef(Date.now())
  const loadedRef = useRef(false)

  useEffect(() => { testIdRef.current = testId }, [testId])
  useEffect(() => { attemptRef.current = attempt }, [attempt])
  useEffect(() => { answersRef.current = answers }, [answers])
  useEffect(() => { questionsRef.current = questions }, [questions])
  useEffect(() => { timingsRef.current = timings }, [timings])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      setStarted(false)
      setAccepted(false)
      setAttempt(null)
      setQuestions([])
      setAnswers({})
      setTimings({})
      setMarked(new Set())
      setVisited(new Set())
      setCurrent(0)
      attemptRef.current = null
      questionsRef.current = []
      answersRef.current = {}
      timingsRef.current = {}
      loadedRef.current = false

      try {
        const testRes = await testAPI.getTest(testId)
        if (cancelled) return
        setTest(testRes.data)
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Failed to load test')
        navigate('/tests')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      clearInterval(autoSaveRef.current)
    }
  }, [testId, navigate])

  const beginTest = useCallback(async () => {
    if (!accepted || starting || started) return

    setStarting(true)
    loadedRef.current = false

    try {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen?.()
        }
      } catch {
        // Browsers may reject fullscreen in some environments; show recovery after load.
      }

      let attemptData
      let qData

      if (isPreview) {
        attemptData = {
          id: 'preview',
          attempt_number: 'Preview',
          max_attempts: '∞',
          started_at: new Date().toISOString(),
        }
        const qRes = await adminAPI.getQuestions(testId)
        qData = qRes.data
      } else {
        const attemptRes = await testAPI.startTest(testId)
        attemptData = attemptRes.data
        const qRes = await testAPI.getQuestions(testId, attemptData.id)
        qData = qRes.data
      }

      setAttempt(attemptData)
      attemptRef.current = attemptData
      setAttemptNumber(attemptData.attempt_number || 1)
      setMaxAttempts(attemptData.max_attempts || 6)

      setQuestions(qData)
      questionsRef.current = qData
      setVisited(qData[0] ? new Set([qData[0].id]) : new Set())
      setAnswers({})
      setTimings({})
      setMarked(new Set())
      setCurrent(0)
      setNatInput('')
      setTabViolations(0)
      setFsViolations(0)
      setShowFsWarning(false)
      tabViolRef.current = 0
      fsViolRef.current = 0
      answersRef.current = {}
      timingsRef.current = {}
      setStarted(true)

      setTimeout(() => {
        loadedRef.current = true
        if (!document.fullscreenElement) {
          setShowFsWarning(true)
        }
      }, 2000)
    } catch (err) {
      console.error('TestEngine beginTest error:', err)
      toast.error(err.response?.data?.detail || 'Failed to start test')
      navigate('/tests')
    } finally {
      setStarting(false)
    }
  }, [accepted, navigate, starting, started, testId, isPreview])

  const doSubmitCore = useCallback(async (auto = false) => {
    if (submitLockRef.current) return
    submitLockRef.current = true
    setSubmitting(true)
    clearInterval(autoSaveRef.current)

    try {
      if (document.fullscreenElement) await document.exitFullscreen()
    } catch {}

    if (isPreview) {
      if (auto) toast('Time up! Auto-submitted preview.', { duration: 5000 })
      else toast.success('Preview submitted successfully! (No data saved)')
      submitLockRef.current = false
      setSubmitting(false)
      navigate(`/admin/tests/${testIdRef.current}`)
      return
    }

    const currentAttempt = attemptRef.current
    const currentAnswers = answersRef.current
    const currentQuestions = questionsRef.current
    const currentTimings = timingsRef.current

    if (!currentAttempt) {
      submitLockRef.current = false
      setSubmitting(false)
      return
    }

    try {
      const ans = currentQuestions.map(q => ({
        question_id: q.id,
        selected_answer: currentAnswers[q.id] || null,
        time_spent_seconds: currentTimings[q.id] || 0,
      }))
      const res = await testAPI.submitTest(testIdRef.current, currentAttempt.id, ans)
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
      toast.error(err.response?.data?.detail || 'Submit failed. Please try again.')
      submitLockRef.current = false
      setSubmitting(false)
    }
  }, [isPreview, navigate])

  const doSubmitRef = useRef(doSubmitCore)
  useEffect(() => { doSubmitRef.current = doSubmitCore }, [doSubmitCore])

  const doSubmit = useCallback((auto = false) => doSubmitRef.current(auto), [])
  const handleTimerExpire = useCallback(() => {
    doSubmitRef.current(true)
  }, [])

  useAntiCheat({
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
  })

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
  }, [current, questions])

  useEffect(() => {
    const q = questions[current]
    if (q) setVisited(v => new Set([...v, q.id]))
  }, [current, questions])

  useEffect(() => {
    const q = questions[current]
    if (q?.question_type === 'nat') setNatInput(answers[q.id] || '')
  }, [current, questions, answers])

  useEffect(() => {
    if (!attempt || isPreview) return
    autoSaveRef.current = setInterval(() => {
      const ans = Object.entries(answersRef.current).map(([qid, sel]) => ({
        question_id: +qid,
        selected_answer: sel,
        time_spent_seconds: timingsRef.current[+qid] || 0,
      }))
      if (ans.length > 0) {
        testAPI.saveAnswers(testIdRef.current, attemptRef.current?.id, ans).catch(() => {})
      }
    }, 30000)
    return () => clearInterval(autoSaveRef.current)
  }, [attempt, isPreview])

  const currentQuestion = questions[current]

  const setMCQ = useCallback((letter) => {
    if (!currentQuestion) return
    setAnswers(a => {
      const updated = { ...a, [currentQuestion.id]: a[currentQuestion.id] === letter ? undefined : letter }
      answersRef.current = updated
      return updated
    })
  }, [currentQuestion])

  const toggleMSQ = useCallback((letter) => {
    if (!currentQuestion) return
    setAnswers(a => {
      const cur = (a[currentQuestion.id] || '').split(',').filter(Boolean)
      const next = cur.includes(letter) ? cur.filter(l => l !== letter) : [...cur, letter].sort()
      const updated = { ...a, [currentQuestion.id]: next.join(',') || undefined }
      answersRef.current = updated
      return updated
    })
  }, [currentQuestion])

  const commitNAT = useCallback(() => {
    if (!currentQuestion) return
    setAnswers(a => {
      const updated = { ...a, [currentQuestion.id]: natInput.trim() || undefined }
      answersRef.current = updated
      return updated
    })
  }, [currentQuestion, natInput])

  const saveAndNext = useCallback(() => {
    if (currentQuestion?.question_type === 'nat') commitNAT()
    if (current < questions.length - 1) setCurrent(c => c + 1)
  }, [commitNAT, current, currentQuestion, questions.length])

  const markAndNext = useCallback(() => {
    if (!currentQuestion) return
    setMarked(m => {
      const n = new Set(m)
      n.has(currentQuestion.id) ? n.delete(currentQuestion.id) : n.add(currentQuestion.id)
      return n
    })
    if (current < questions.length - 1) setCurrent(c => c + 1)
  }, [current, currentQuestion, questions.length])

  const clearResponse = useCallback(() => {
    if (!currentQuestion) return
    setAnswers(a => {
      const n = { ...a }
      delete n[currentQuestion.id]
      answersRef.current = n
      return n
    })
    setNatInput('')
  }, [currentQuestion])

  const subjects = useMemo(() => {
    return [...new Set(questions.map(q => q.subject || 'General'))]
  }, [questions])

  const answered = useMemo(() => {
    return Object.values(answers).filter(Boolean).length
  }, [answers])

  const notAnswered = questions.length - answered
  const totalViolations = tabViolations + fsViolations
  const endTimeMs = useMemo(
    () => getEndTimeMs(attempt?.started_at, test?.duration_minutes),
    [attempt?.started_at, test?.duration_minutes]
  )

  return {
    accepted,
    answered,
    answers,
    attemptNumber,
    beginTest,
    clearResponse,
    commitNAT,
    current,
    currentQuestion,
    doSubmit,
    endTimeMs,
    fsViolations,
    handleTimerExpire,
    loading,
    markAndNext,
    marked,
    maxAttempts,
    natInput,
    navigate,
    notAnswered,
    questions,
    saveAndNext,
    setAccepted,
    setCurrent,
    setNatInput,
    setShowCalc,
    setShowConfirm,
    setShowFsWarning,
    setShowPalette,
    setMCQ,
    showCalc,
    showConfirm,
    showFsWarning,
    showPalette,
    started,
    starting,
    subjects,
    submitting,
    tabViolations,
    test,
    toggleMSQ,
    totalViolations,
    visited,
  }
}
