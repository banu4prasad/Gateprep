import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminAPI, testAPI } from '../api/api'
import useAttemptLifecycle from './useAttemptLifecycle'
import type { AttemptLifecycleParams } from './useAttemptLifecycle'
import type { TestQuestion } from '@/types/api'
import type { AxiosResponse } from 'axios'

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

afterEach(() => {
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
    const qData: TestQuestion[] = [{ id: 5, question_type: 'nat' }]
    vi.mocked(testAPI.startTest).mockResolvedValueOnce({
      data: {
        id: 20,
        status: 'in_progress',
        started_at: '2026-01-01T10:00:00Z',
        attempt_number: 2,
        max_attempts: 6,
        answers: [{
          question_id: 5,
          selected_answer: '123.5',
          time_spent_seconds: 48,
        }],
        tab_violations: 1,
        fullscreen_violations: 2,
      },
    } as AxiosResponse)
    vi.mocked(testAPI.getQuestions).mockResolvedValueOnce({ data: qData } as AxiosResponse)

    const { result } = renderHook(() => useAttemptLifecycle({
      testId: 7,
      isPreview: false,
      navigate: vi.fn(),
      attemptRef,
      questionsRef: { current: [] },
      answersRef,
      timingsRef,
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
    }))

    act(() => result.current.setAccepted(true))
    await act(async () => result.current.beginTest())

    expect(attemptRef.current?.id).toBe(20)
    expect(answersRef.current).toEqual({ 5: '123.5' })
    expect(timingsRef.current).toEqual({ 5: 48 })
  })
})
