import type { NavigateFunction } from 'react-router-dom'

/** Check whether the current router entry has an in-app history entry behind it. */
export function canGoBackInApp(locationKey: string): boolean {
  const historyState: unknown = typeof window !== 'undefined' ? window.history?.state : null
  if (
    historyState &&
    typeof historyState === 'object' &&
    'idx' in historyState &&
    typeof historyState.idx === 'number'
  ) {
    return historyState.idx > 0
  }
  return locationKey !== 'default'
}

/** Navigate back in router history when possible, otherwise replace with fallback. */
export function navigateBackOrFallback(
  navigate: NavigateFunction,
  locationKey: string,
  fallback: string,
): void {
  if (canGoBackInApp(locationKey)) {
    navigate(-1)
    return
  }
  navigate(fallback, { replace: true })
}
