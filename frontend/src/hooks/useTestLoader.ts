import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { getApiErrorDetail } from '@/lib/apiError'
import { testAPI } from '../api/api'
import type { TestDetail } from '@/types/api'

export type TestLoadStatus = 'loading' | 'ready' | 'not_found' | 'error'

export interface TestLoaderParams {
  testId: string | number | undefined
}

export interface TestLoaderResult {
  test: TestDetail | null
  loading: boolean
  status: TestLoadStatus
  errorMessage: string | null
  retry: () => void
}

function isValidNumericId(value: string | number | undefined): value is string | number {
  if (value === undefined || value === null) return false
  return /^\d+$/.test(String(value).trim())
}

function getResponseStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined
  const response = error.response
  if (!response || typeof response !== 'object' || !('status' in response)) return undefined
  return typeof response.status === 'number' ? response.status : undefined
}

/** Load test metadata for `/tests/:testId`, distinguishing missing/invalid IDs from transient errors. */
export default function useTestLoader({ testId }: TestLoaderParams): TestLoaderResult {
  const [test, setTest] = useState<TestDetail | null>(null)
  const [status, setStatus] = useState<TestLoadStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)

  const retry = useCallback(() => {
    setReloadNonce(n => n + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    if (!isValidNumericId(testId)) {
      setTest(null)
      setStatus('not_found')
      setErrorMessage('Test not found')
      return
    }

    ;(async () => {
      setStatus('loading')
      setTest(null)
      setErrorMessage(null)

      try {
        const testRes = await testAPI.getTest(testId)
        if (cancelled) return
        setTest(testRes.data)
        setStatus('ready')
      } catch (err: unknown) {
        if (cancelled) return
        const httpStatus = getResponseStatus(err)
        if (httpStatus === 404 || httpStatus === 422) {
          setStatus('not_found')
          setErrorMessage('Test not found')
        } else {
          const message = getApiErrorDetail(err) || 'Failed to load test'
          toast.error(message)
          setStatus('error')
          setErrorMessage(message)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [testId, reloadNonce])

  return {
    test,
    loading: status === 'loading',
    status,
    errorMessage,
    retry,
  }
}
