import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminAPI, testAPI } from '../api/api'
import useAttemptLifecycle from './useAttemptLifecycle'
import type { AttemptLifecycleParams } from './useAttemptLifecycle'
import { AxiosHeaders } from 'axios'
import type { ApiResponse, AttemptStart, TestQuestion } from '@/types/api'
import toast from 'react-hot-toast'

vi.mock('../api/api', () => ({
  adminAPI: { getQuestions: vi.fn() },
  testAPI: {
    startTest: vi.fn(),
    getQuestions: vi.fn(),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn() },
}))

function apiResponse<T>(data: T): ApiResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
}

function createOptions(testId: AttemptLifecycleParams['testId']): AttemptLifecycleParams {
  return {
    testId,
    isPreview: false,
    navigate: vi.fn(),
    attemptRef: { current: null },
    questionsRef: { current: [] },
    answersRef: { current: {} },
    timingsRef: { current: {} },
    loadedRef: { current: false },
    setQuestions: vi.fn(),
    setAnswers: vi.fn(),
    setTimings: vi.fn(),
    setMarked: vi.fn(),
    setVisited: vi.fn(),
    setCurrent: vi.fn(),
    setNatInput: vi.fn(),
    setTabViolations: vi.fn(),
    setFsViolations: vi.fn(),
    setShowFsWarning: vi.fn(),
    tabViolRef: { current: 0 },
    fsViolRef: { current: 0 },
    setStarted: vi.fn(),
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('useAttemptLifecycle resume', () => {
  it('restores autosaved answers, timings, and violations from the active attempt', async () => {
    vi.useFakeTimers()
    const attemptRef: AttemptLifecycleParams['attemptRef'] = { current: null }
    const answersRef = { current: {} }
    const timingsRef = { current: {} }
    const qData: TestQuestion[] = [{
      id: 5,
      question_type: 'nat',
      question_text: 'NAT',
      question_image_url: null,
      options: [],
      option_images: null,
      order_index: 0,
      marks: 1,
      negative_marks: 0,
      subject: null,
      topic: null,
    }]
    const attemptData: AttemptStart = {
      id: 20,
      test_id: 7,
      status: 'in_progress',
      started_at: '2026-01-01T10:00:00Z',
      submitted_at: null,
      score: null,
      total_marks: null,
      tab_violations: 1,
      fullscreen_violations: 2,
      server_time: '2026-01-01T10:00:00Z',
      answers: [{ question_id: 5, selected_answer: '123.5', time_spent_seconds: 48 }],
      attempt_number: 2,
      max_attempts: 6,
    }
    vi.mocked(testAPI.startTest).mockResolvedValueOnce(apiResponse(attemptData))
    vi.mocked(testAPI.getQuestions).mockResolvedValueOnce(apiResponse(qData))

    const options = {
      ...createOptions(7),
      attemptRef,
      answersRef,
      timingsRef,
    }
    const { result } = renderHook(() => useAttemptLifecycle(options))

    act(() => result.current.setAccepted(true))
    await act(async () => result.current.beginTest())

    expect(attemptRef.current?.id).toBe(20)
    expect(answersRef.current).toEqual({ 5: '123.5' })
    expect(timingsRef.current).toEqual({ 5: 48 })
    expect(options.setVisited).toHaveBeenCalledWith(new Set([5]))
    expect(testAPI.startTest).toHaveBeenCalledExactlyOnceWith(7)
    expect(testAPI.getQuestions).toHaveBeenCalledExactlyOnceWith(7, 20)
  })
})

describe('useAttemptLifecycle identifier validation', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('returns before starting when the test identifier is missing', async () => {
    const options = createOptions(undefined)
    const { result } = renderHook(() => useAttemptLifecycle(options))

    act(() => result.current.setAccepted(true))
    await act(async () => result.current.beginTest())

    expect(testAPI.startTest).not.toHaveBeenCalled()
    expect(testAPI.getQuestions).not.toHaveBeenCalled()
    expect(options.loadedRef.current).toBe(false)
    expect(options.setStarted).not.toHaveBeenCalled()
    expect(result.current.starting).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Test identifier is required')
    expect(options.navigate).toHaveBeenCalledWith('/tests')
  })

  it('returns before starting when the test identifier is empty', async () => {
    const options = createOptions('')
    const { result } = renderHook(() => useAttemptLifecycle(options))

    act(() => result.current.setAccepted(true))
    await act(async () => result.current.beginTest())

    expect(testAPI.startTest).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Test identifier is required')
    expect(options.navigate).toHaveBeenCalledWith('/tests')
    expect(result.current.starting).toBe(false)
  })

  it('starts with numeric test identifier zero', async () => {
    vi.mocked(testAPI.startTest).mockRejectedValueOnce(new Error('request failed'))
    const options = createOptions(0)
    const { result } = renderHook(() => useAttemptLifecycle(options))

    act(() => result.current.setAccepted(true))
    await act(async () => result.current.beginTest())

    expect(testAPI.startTest).toHaveBeenCalledExactlyOnceWith(0)
  })

  it('displays the server error detail when starting fails with a string detail', async () => {
    vi.mocked(testAPI.startTest).mockRejectedValueOnce({
      response: { data: { detail: 'Already active' } },
    })
    const options = createOptions(1)
    const { result } = renderHook(() => useAttemptLifecycle(options))

    act(() => result.current.setAccepted(true))
    await act(async () => result.current.beginTest())

    expect(toast.error).toHaveBeenCalledWith('Already active')
    expect(options.navigate).toHaveBeenCalledWith('/tests')
  })

  it('displays the fallback error message when starting fails with an array detail', async () => {
    vi.mocked(testAPI.startTest).mockRejectedValueOnce({
      response: { data: { detail: [{ msg: 'Validation failed' }] } },
    })
    const options = createOptions(1)
    const { result } = renderHook(() => useAttemptLifecycle(options))

    act(() => result.current.setAccepted(true))
    await act(async () => result.current.beginTest())

    expect(toast.error).toHaveBeenCalledWith('Failed to start test')
    expect(options.navigate).toHaveBeenCalledWith('/tests')
  })
})

describe('useAttemptLifecycle fullscreen fallback', () => {
  const originalFullscreenEnabled = Object.getOwnPropertyDescriptor(document, 'fullscreenEnabled')
  const originalFullscreenElement = Object.getOwnPropertyDescriptor(document, 'fullscreenElement')
  const originalRequestFullscreen = Object.getOwnPropertyDescriptor(document.documentElement, 'requestFullscreen')
  const originalExitFullscreen = Object.getOwnPropertyDescriptor(document, 'exitFullscreen')

  const mockAttempt: AttemptStart = {
    id: 42,
    test_id: 7,
    status: 'in_progress',
    started_at: '2026-01-01T10:00:00Z',
    submitted_at: null,
    score: null,
    total_marks: null,
    tab_violations: 0,
    fullscreen_violations: 0,
    server_time: '2026-01-01T10:00:00Z',
    answers: [],
    attempt_number: 1,
    max_attempts: 6,
  }

  const mockQuestions: TestQuestion[] = [{
    id: 1,
    question_type: 'mcq',
    question_text: 'Sample?',
    question_image_url: null,
    options: ['A', 'B'],
    option_images: null,
    order_index: 0,
    marks: 1,
    negative_marks: 0,
    subject: null,
    topic: null,
  }]

  function setDocumentFullscreenProps(props: {
    enabled?: boolean
    element?: Element | null
    requestFullscreen?: (() => Promise<void>) | undefined
  }) {
    if ('enabled' in props) {
      Object.defineProperty(document, 'fullscreenEnabled', {
        configurable: true,
        value: props.enabled,
      })
    }
    if ('element' in props) {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: props.element,
      })
    }
    if ('requestFullscreen' in props) {
      Object.defineProperty(document.documentElement, 'requestFullscreen', {
        configurable: true,
        value: props.requestFullscreen,
      })
    }
  }

  function restoreDescriptor(target: object, key: string, descriptor: PropertyDescriptor | undefined) {
    if (descriptor) {
      Object.defineProperty(target, key, descriptor)
    } else {
      delete (target as Record<string, unknown>)[key]
    }
  }

  beforeEach(() => {
    vi.mocked(testAPI.startTest).mockResolvedValue(apiResponse(mockAttempt))
    vi.mocked(testAPI.getQuestions).mockResolvedValue(apiResponse(mockQuestions))
  })

  afterEach(() => {
    restoreDescriptor(document, 'fullscreenEnabled', originalFullscreenEnabled)
    restoreDescriptor(document, 'fullscreenElement', originalFullscreenElement)
    restoreDescriptor(document.documentElement, 'requestFullscreen', originalRequestFullscreen)
    restoreDescriptor(document, 'exitFullscreen', originalExitFullscreen)
  })

  it('skips requestFullscreen and starts the exam when document.fullscreenEnabled is false', async () => {
    vi.useFakeTimers()
    const requestFullscreen = vi.fn(() => new Promise<void>(() => {}))
    setDocumentFullscreenProps({
      enabled: false,
      element: null,
      requestFullscreen,
    })

    const options = createOptions(7)
    const { result } = renderHook(() => useAttemptLifecycle(options))

    act(() => result.current.setAccepted(true))
    await act(async () => result.current.beginTest())

    expect(requestFullscreen).not.toHaveBeenCalled()
    expect(options.setStarted).toHaveBeenCalledWith(true)
    expect(result.current.starting).toBe(false)
    expect(result.current.fullscreenUnavailable).toBe(true)

    act(() => vi.advanceTimersByTime(2000))
    expect(options.loadedRef.current).toBe(true)
    expect(options.setShowFsWarning).not.toHaveBeenCalledWith(true)
  })

  it('falls back gracefully when requestFullscreen throws synchronously', async () => {
    vi.useFakeTimers()
    const requestFullscreen = vi.fn(() => {
      throw new Error('Fullscreen blocked')
    })
    setDocumentFullscreenProps({
      enabled: true,
      element: null,
      requestFullscreen,
    })

    const options = createOptions(7)
    const { result } = renderHook(() => useAttemptLifecycle(options))

    act(() => result.current.setAccepted(true))
    await act(async () => result.current.beginTest())

    expect(requestFullscreen).toHaveBeenCalledOnce()
    expect(options.setStarted).toHaveBeenCalledWith(true)
    expect(result.current.starting).toBe(false)
    expect(result.current.fullscreenUnavailable).toBe(true)

    act(() => vi.advanceTimersByTime(2000))
    expect(options.loadedRef.current).toBe(true)
    expect(options.setShowFsWarning).not.toHaveBeenCalledWith(true)
  })

  it('falls back gracefully when requestFullscreen rejects', async () => {
    vi.useFakeTimers()
    const requestFullscreen = vi.fn().mockRejectedValue(new Error('Permission denied'))
    setDocumentFullscreenProps({
      enabled: true,
      element: null,
      requestFullscreen,
    })

    const options = createOptions(7)
    const { result } = renderHook(() => useAttemptLifecycle(options))

    act(() => result.current.setAccepted(true))
    await act(async () => result.current.beginTest())

    expect(requestFullscreen).toHaveBeenCalledOnce()
    expect(options.setStarted).toHaveBeenCalledWith(true)
    expect(result.current.starting).toBe(false)
    expect(result.current.fullscreenUnavailable).toBe(true)

    act(() => vi.advanceTimersByTime(2000))
    expect(options.loadedRef.current).toBe(true)
    expect(options.setShowFsWarning).not.toHaveBeenCalledWith(true)
  })

  it('does not hang when requestFullscreen returns a never-settling promise', async () => {
    vi.useFakeTimers()
    const requestFullscreen = vi.fn(() => new Promise<void>(() => {}))
    setDocumentFullscreenProps({
      enabled: true,
      element: null,
      requestFullscreen,
    })

    const options = createOptions(7)
    const { result } = renderHook(() => useAttemptLifecycle(options))

    act(() => result.current.setAccepted(true))
    await act(async () => result.current.beginTest())

    expect(requestFullscreen).toHaveBeenCalledOnce()
    expect(options.setStarted).toHaveBeenCalledWith(true)
    expect(result.current.starting).toBe(false)

    act(() => vi.advanceTimersByTime(2000))
    expect(options.loadedRef.current).toBe(true)
    expect(result.current.fullscreenUnavailable).toBe(true)
    expect(options.setShowFsWarning).not.toHaveBeenCalledWith(true)
  })

  it('enters fullscreen cleanly without notice when requestFullscreen succeeds', async () => {
    vi.useFakeTimers()
    const requestFullscreen = vi.fn(async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: document.documentElement,
      })
    })
    setDocumentFullscreenProps({
      enabled: true,
      element: null,
      requestFullscreen,
    })

    const options = createOptions(7)
    const { result } = renderHook(() => useAttemptLifecycle(options))

    act(() => result.current.setAccepted(true))
    await act(async () => result.current.beginTest())

    expect(requestFullscreen).toHaveBeenCalledOnce()
    expect(options.setStarted).toHaveBeenCalledWith(true)
    expect(result.current.starting).toBe(false)
    expect(result.current.fullscreenUnavailable).toBe(false)

    act(() => vi.advanceTimersByTime(2000))
    expect(options.loadedRef.current).toBe(true)
    expect(options.setShowFsWarning).not.toHaveBeenCalledWith(true)
  })

  it('shows FullscreenWarning after 2 seconds if fullscreen was entered and exited early', async () => {
    vi.useFakeTimers()
    const requestFullscreen = vi.fn(async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: document.documentElement,
      })
    })
    setDocumentFullscreenProps({
      enabled: true,
      element: null,
      requestFullscreen,
    })

    const options = createOptions(7)
    const { result } = renderHook(() => useAttemptLifecycle(options))

    act(() => result.current.setAccepted(true))
    await act(async () => result.current.beginTest())

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    })

    act(() => vi.advanceTimersByTime(2000))
    expect(options.loadedRef.current).toBe(true)
    expect(options.setShowFsWarning).toHaveBeenCalledWith(true)
  })

  it('resets starting and exits fullscreen if starting the attempt fails', async () => {
    const exitFullscreen = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: exitFullscreen,
    })
    const requestFullscreen = vi.fn(async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: document.documentElement,
      })
    })
    setDocumentFullscreenProps({
      enabled: true,
      element: null,
      requestFullscreen,
    })
    vi.mocked(testAPI.startTest).mockRejectedValueOnce(new Error('network error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const options = createOptions(7)
    const { result } = renderHook(() => useAttemptLifecycle(options))

    act(() => result.current.setAccepted(true))
    await act(async () => result.current.beginTest())

    expect(result.current.starting).toBe(false)
    expect(result.current.fullscreenUnavailable).toBe(false)
    expect(exitFullscreen).toHaveBeenCalledOnce()
    expect(options.navigate).toHaveBeenCalledWith('/tests')

    consoleSpy.mockRestore()
  })
})
