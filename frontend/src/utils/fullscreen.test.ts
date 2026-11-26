import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  exitFullscreenBestEffort,
  isFullscreenSupported,
  requestFullscreenBestEffort,
  type FullscreenRequestOutcome,
} from './fullscreen'

describe('fullscreen utilities', () => {
  const originalFullscreenEnabled = Object.getOwnPropertyDescriptor(document, 'fullscreenEnabled')
  const originalFullscreenElement = Object.getOwnPropertyDescriptor(document, 'fullscreenElement')
  const originalRequestFullscreen = Object.getOwnPropertyDescriptor(document.documentElement, 'requestFullscreen')
  const originalExitFullscreen = Object.getOwnPropertyDescriptor(document, 'exitFullscreen')

  function restoreDescriptor(target: object, key: string, descriptor: PropertyDescriptor | undefined) {
    if (descriptor) {
      Object.defineProperty(target, key, descriptor)
    } else {
      delete (target as Record<string, unknown>)[key]
    }
  }

  afterEach(() => {
    restoreDescriptor(document, 'fullscreenEnabled', originalFullscreenEnabled)
    restoreDescriptor(document, 'fullscreenElement', originalFullscreenElement)
    restoreDescriptor(document.documentElement, 'requestFullscreen', originalRequestFullscreen)
    restoreDescriptor(document, 'exitFullscreen', originalExitFullscreen)
    vi.clearAllMocks()
  })

  it('reports unsupported when fullscreenEnabled is false even if requestFullscreen exists', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false })
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: vi.fn(),
    })

    expect(isFullscreenSupported()).toBe(false)
  })

  it('reports supported when fullscreenEnabled is true and requestFullscreen is a function', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: vi.fn(),
    })

    expect(isFullscreenSupported()).toBe(true)
  })

  it('invokes onSettled with unsupported and returns false when fullscreen is disabled', () => {
    const requestFullscreen = vi.fn()
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false })
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    })
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    })

    const outcomes: FullscreenRequestOutcome[] = []
    const initiated = requestFullscreenBestEffort({
      onSettled: outcome => outcomes.push(outcome),
    })

    expect(initiated).toBe(false)
    expect(requestFullscreen).not.toHaveBeenCalled()
    expect(outcomes).toEqual(['unsupported'])
  })

  it('returns false and reports entered synchronously when already in fullscreen', () => {
    const requestFullscreen = vi.fn()
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: document.documentElement,
    })
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    })

    const outcomes: FullscreenRequestOutcome[] = []
    const initiated = requestFullscreenBestEffort({
      onSettled: outcome => outcomes.push(outcome),
    })

    expect(initiated).toBe(false)
    expect(requestFullscreen).not.toHaveBeenCalled()
    expect(outcomes).toEqual(['entered'])
  })

  it('handles synchronous throws and rejected promises without throwing', async () => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: vi.fn(() => {
        throw new Error('sync error')
      }),
    })

    const syncOutcomes: FullscreenRequestOutcome[] = []
    expect(requestFullscreenBestEffort({ onSettled: o => syncOutcomes.push(o) })).toBe(false)
    expect(syncOutcomes).toEqual(['blocked'])

    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('rejected')),
    })

    const asyncOutcomes: FullscreenRequestOutcome[] = []
    expect(requestFullscreenBestEffort({ onSettled: o => asyncOutcomes.push(o) })).toBe(true)
    await Promise.resolve()
    await Promise.resolve()
    expect(asyncOutcomes).toEqual(['blocked'])
  })

  it('calls onSettled once with entered when async requestFullscreen resolves', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    })

    const onSettled = vi.fn()
    expect(requestFullscreenBestEffort({ onSettled })).toBe(true)
    await Promise.resolve()

    expect(onSettled).toHaveBeenCalledExactlyOnceWith('entered')
  })

  it('handles synchronous non-promise requestFullscreen return values', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: vi.fn(() => undefined),
    })

    const onBlocked = vi.fn()
    expect(requestFullscreenBestEffort({ onSettled: onBlocked })).toBe(true)
    expect(onBlocked).toHaveBeenCalledExactlyOnceWith('blocked')

    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: vi.fn(() => {
        Object.defineProperty(document, 'fullscreenElement', {
          configurable: true,
          value: document.documentElement,
        })
        return undefined
      }),
    })

    const onEntered = vi.fn()
    expect(requestFullscreenBestEffort({ onSettled: onEntered })).toBe(true)
    expect(onEntered).toHaveBeenCalledExactlyOnceWith('entered')
  })

  it('exits fullscreen safely when exitFullscreen throws, rejects, succeeds, or is unnecessary', async () => {
    const noopExit = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: noopExit })
    exitFullscreenBestEffort()
    expect(noopExit).not.toHaveBeenCalled()

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: document.documentElement,
    })
    exitFullscreenBestEffort()
    expect(noopExit).toHaveBeenCalledOnce()

    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: undefined })
    expect(() => exitFullscreenBestEffort()).not.toThrow()

    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: vi.fn(() => {
        throw new Error('exit error')
      }),
    })
    expect(() => exitFullscreenBestEffort()).not.toThrow()

    const rejectingExit = vi.fn().mockRejectedValue(new Error('exit rejected'))
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: rejectingExit,
    })
    expect(() => exitFullscreenBestEffort()).not.toThrow()
    expect(rejectingExit).toHaveBeenCalledOnce()
    await Promise.resolve()
  })
})
