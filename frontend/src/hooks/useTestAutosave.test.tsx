import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { testAPI } from '../api/api'
import useTestAutosave from './useTestAutosave'
import type { TestAutosaveParams } from './useTestAutosave'
import type { AxiosResponse } from 'axios'

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
    vi.mocked(testAPI.saveAnswers).mockResolvedValue({ data: { message: 'Saved' } } as AxiosResponse)
    const answersRef = { current: {} }
    const timingsRef = { current: {} }
    const attemptRef: TestAutosaveParams['attemptRef'] = { current: { id: 3 } }
    const testIdRef: TestAutosaveParams['testIdRef'] = { current: 7 }

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
