import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { testAPI } from '../api/api'
import useTestSubmission from './useTestSubmission'

vi.mock('../api/api', () => ({
  testAPI: { submitTest: vi.fn() },
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), mock: vi.fn() },
}))

describe('useTestSubmission NAT answers', () => {
  it('commits the active NAT answer before building the submit payload', async () => {
    const answersRef = { current: {} }
    const commitNAT = vi.fn(() => {
      answersRef.current = { ...answersRef.current, 1: '42' }
    })
    testAPI.submitTest.mockResolvedValueOnce({ data: { id: 9 } })

    const { result } = renderHook(() => useTestSubmission({
      isPreview: false,
      navigate: vi.fn(),
      attemptRef: { current: { id: 3 } },
      answersRef,
      questionsRef: { current: [{ id: 1 }] },
      timingsRef: { current: {} },
      testIdRef: { current: 7 },
      autoSaveRef: { current: null },
      commitNAT,
    }))

    await act(async () => result.current.doSubmit())

    expect(commitNAT).toHaveBeenCalledOnce()
    expect(testAPI.submitTest).toHaveBeenCalledWith(7, 3, [
      { question_id: 1, selected_answer: '42', time_spent_seconds: 0 },
    ])
  })
})
