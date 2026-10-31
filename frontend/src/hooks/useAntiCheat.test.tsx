import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import useAntiCheat from './useAntiCheat'
import type { AntiCheatParams } from './useAntiCheat'

vi.mock('../api/api', () => ({
  testAPI: { updateViolations: vi.fn(() => Promise.resolve()) },
}))

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { error: vi.fn() }),
}))

function createOptions(attemptRef: AntiCheatParams['attemptRef']): AntiCheatParams {
  return {
    attemptRef,
    doSubmitRef: { current: vi.fn() },
    fsViolRef: { current: 0 },
    isPreview: false,
    loadedRef: { current: true },
    setFsViolations: vi.fn(),
    setShowFsWarning: vi.fn(),
    setTabViolations: vi.fn(),
    tabViolRef: { current: 0 },
    testIdRef: { current: 7 },
  }
}

describe('useAntiCheat beforeunload warning', () => {
  it('warns before leaving while an attempt is active', () => {
    const { unmount } = renderHook(() => useAntiCheat(createOptions({ current: { id: 3 } })))
    const event = new Event('beforeunload', { cancelable: true })

    act(() => window.dispatchEvent(event))

    expect(event.defaultPrevented).toBe(true)
    unmount()
  })

  it('does not warn before an attempt has started', () => {
    const { unmount } = renderHook(() => useAntiCheat(createOptions({ current: null })))
    const event = new Event('beforeunload', { cancelable: true })

    act(() => window.dispatchEvent(event))

    expect(event.defaultPrevented).toBe(false)
    unmount()
  })
})

describe('useAntiCheat window switching', () => {
  it('counts a fullscreen exit and visibility change as one violation', () => {
    vi.useFakeTimers()
    const options = createOptions({ current: { id: 3 } })
    const { unmount } = renderHook(() => useAntiCheat(options))

    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'))
      document.dispatchEvent(new Event('visibilitychange'))
      vi.runAllTimers()
    })

    expect(options.fsViolRef.current).toBe(0)
    expect(options.tabViolRef.current).toBe(1)
    expect(options.setFsViolations).not.toHaveBeenCalled()
    expect(options.setTabViolations).toHaveBeenCalledWith(1)

    unmount()
    vi.useRealTimers()
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  })

  it('still counts a standalone fullscreen exit', () => {
    vi.useFakeTimers()
    const options = createOptions({ current: { id: 3 } })
    const { unmount } = renderHook(() => useAntiCheat(options))

    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'))
      vi.runAllTimers()
    })

    expect(options.fsViolRef.current).toBe(1)
    expect(options.setFsViolations).toHaveBeenCalledWith(1)

    unmount()
    vi.useRealTimers()
  })
})

describe('useAntiCheat keyboard restrictions', () => {
  it.each(['c', 'v', 'a', 'u'])('blocks Command+%s shortcuts', key => {
    const { unmount } = renderHook(() => useAntiCheat(createOptions({ current: { id: 3 } })))
    const event = new KeyboardEvent('keydown', {
      key,
      metaKey: true,
      cancelable: true,
    })

    act(() => document.dispatchEvent(event))

    expect(event.defaultPrevented).toBe(true)
    unmount()
  })

  it('continues to block Ctrl shortcuts', () => {
    const { unmount } = renderHook(() => useAntiCheat(createOptions({ current: { id: 3 } })))
    const event = new KeyboardEvent('keydown', {
      key: 'c',
      ctrlKey: true,
      cancelable: true,
    })

    act(() => document.dispatchEvent(event))

    expect(event.defaultPrevented).toBe(true)
    unmount()
  })
})
