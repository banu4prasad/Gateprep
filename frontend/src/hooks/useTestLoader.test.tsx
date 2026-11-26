import { act, renderHook, waitFor } from '@testing-library/react'
import { AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { testAPI } from '../api/api'
import type { ApiResponse, TestDetail } from '@/types/api'
import useTestLoader from './useTestLoader'
import type { TestLoaderParams } from './useTestLoader'

vi.mock('../api/api', () => ({
  testAPI: { getTest: vi.fn() },
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

const testDetail: TestDetail = {
  id: 17,
  title: 'GATE Mock Test',
  description: null,
  duration_minutes: 180,
  total_marks: 100,
  question_count: 2,
  series_id: null,
  created_at: '2026-01-01T00:00:00Z',
  test_type: null,
}

const invalidTestIds: Array<[string, TestLoaderParams['testId']]> = [
  ['undefined', undefined],
  ['empty', ''],
  ['non-numeric', 'does-not-exist'],
  ['mixed alphanumeric', '12abc'],
  ['negative', '-5'],
]

afterEach(() => {
  vi.clearAllMocks()
})

describe('useTestLoader identifier validation and error classification', () => {
  it.each(invalidTestIds)('marks status as not_found without requesting API when testId is %s', async (_name, testId) => {
    const { result } = renderHook(() => useTestLoader({ testId }))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.test).toBeNull()
    expect(result.current.status).toBe('not_found')
    expect(result.current.errorMessage).toBe('Test not found')
    expect(testAPI.getTest).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('loads the requested test when its identifier is valid', async () => {
    vi.mocked(testAPI.getTest).mockResolvedValueOnce(apiResponse(testDetail))
    const { result } = renderHook(() => useTestLoader({ testId: 17 }))

    await waitFor(() => expect(result.current.test).toEqual(testDetail))

    expect(result.current.status).toBe('ready')
    expect(result.current.errorMessage).toBeNull()
    expect(testAPI.getTest).toHaveBeenCalledExactlyOnceWith(17)
  })

  it('clears a previously loaded test when its identifier becomes absent', async () => {
    vi.mocked(testAPI.getTest).mockResolvedValueOnce(apiResponse(testDetail))
    const initialProps: TestLoaderParams = { testId: 17 }
    const { result, rerender } = renderHook(
      ({ testId }: TestLoaderParams) => useTestLoader({ testId }),
      { initialProps },
    )

    await waitFor(() => expect(result.current.test).toEqual(testDetail))
    rerender({ testId: undefined })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.test).toBeNull()
    expect(result.current.status).toBe('not_found')
    expect(testAPI.getTest).toHaveBeenCalledExactlyOnceWith(17)
  })

  it.each([404, 422])('marks status as not_found without toast on HTTP %i', async (httpStatus) => {
    vi.mocked(testAPI.getTest).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: httpStatus, data: { detail: 'Not found' } },
    })
    const { result } = renderHook(() => useTestLoader({ testId: 999 }))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.test).toBeNull()
    expect(result.current.status).toBe('not_found')
    expect(result.current.errorMessage).toBe('Test not found')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('keeps toast and marks status as error on 500 server failure with string detail', async () => {
    vi.mocked(testAPI.getTest).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: { detail: 'Specific test load failure' } },
    })
    const { result } = renderHook(() => useTestLoader({ testId: 17 }))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.test).toBeNull()
    expect(result.current.status).toBe('error')
    expect(result.current.errorMessage).toBe('Specific test load failure')
    expect(toast.error).toHaveBeenCalledWith('Specific test load failure')
  })

  it('uses fallback toast message on network error or non-string error detail and supports retry', async () => {
    vi.mocked(testAPI.getTest)
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 503, data: { detail: [{ msg: 'Unavailable' }] } },
      })
      .mockResolvedValueOnce(apiResponse(testDetail))

    const { result } = renderHook(() => useTestLoader({ testId: 17 }))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.test).toBeNull()
    expect(result.current.status).toBe('error')
    expect(result.current.errorMessage).toBe('Failed to load test')
    expect(toast.error).toHaveBeenCalledWith('Failed to load test')

    act(() => {
      result.current.retry()
    })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.test).toEqual(testDetail)
    expect(testAPI.getTest).toHaveBeenCalledTimes(2)
  })
})
