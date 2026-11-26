export type FullscreenRequestOutcome = 'entered' | 'unsupported' | 'blocked'

export interface RequestFullscreenOptions {
  onSettled?: (outcome: FullscreenRequestOutcome) => void
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    'then' in value &&
    typeof value.then === 'function'
  )
}

export function isFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false
  return Boolean(
    document.fullscreenEnabled &&
    typeof document.documentElement?.requestFullscreen === 'function',
  )
}

/**
 * Requests fullscreen on a best-effort basis without throwing or hanging if
 * the browser disables, rejects, or stalls the Fullscreen API.
 *
 * Calls `onSettled` exactly once (synchronously when unsupported, already
 * active, throwing, or returning non-Promise; asynchronously on Promise
 * settlement). Returns `true` only if `requestFullscreen()` was actually
 * invoked without throwing synchronously.
 */
export function requestFullscreenBestEffort(
  options: RequestFullscreenOptions = {},
): boolean {
  const { onSettled } = options

  if (typeof document === 'undefined') {
    onSettled?.('unsupported')
    return false
  }

  if (document.fullscreenElement) {
    onSettled?.('entered')
    return false
  }

  if (!isFullscreenSupported()) {
    onSettled?.('unsupported')
    return false
  }

  try {
    const result: unknown = document.documentElement.requestFullscreen()
    if (isPromiseLike(result)) {
      Promise.resolve(result).then(
        () => onSettled?.('entered'),
        () => onSettled?.('blocked'),
      )
      return true
    }

    onSettled?.(document.fullscreenElement ? 'entered' : 'blocked')
    return true
  } catch {
    onSettled?.('blocked')
    return false
  }
}

export function exitFullscreenBestEffort(): void {
  if (typeof document === 'undefined') return
  if (!document.fullscreenElement || typeof document.exitFullscreen !== 'function') return

  try {
    const result: unknown = document.exitFullscreen()
    if (isPromiseLike(result)) {
      Promise.resolve(result).catch(() => {})
    }
  } catch {
    // Ignore exit failures when fullscreen is unavailable or already closed.
  }
}
