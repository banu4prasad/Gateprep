import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { testAPI } from '../api/api'
import useTestAutosave from './useTestAutosave'

vi.mock('../api/api', () => ({
  testAPI: { saveAnswers: vi.fn() },
}))

describe('useTestAutosave', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('sends an empty answer snapshot so cleared answers can be removed', () => {
    vi.useFakeTimers()
    testAPI.saveAnswers.mockResolvedValue({ data: { message: 'Saved' } })
    const answersRef = { current: {} }
    const timingsRef = { current: {} }
    const attemptRef = { current: { id: 3 } }
    const testIdRef = { current: 7 }

    renderHook(() => useTestAutosave({
      attempt: { id: 3 },
      isPreview: false,
      answersRef,
      timingsRef,
      attemptRef,
      testIdRef,
    }))

    act(() => vi.advanceTimersByTime(30000))

    expect(testAPI.saveAnswers).toHaveBeenCalledWith(7, 3, [])
  })
})
