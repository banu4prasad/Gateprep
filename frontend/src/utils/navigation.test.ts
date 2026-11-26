import { afterEach, describe, expect, it } from 'vitest'
import { canGoBackInApp, navigateBackOrFallback } from './navigation'
import { vi } from 'vitest'

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('navigation history helpers', () => {
  it('uses window.history.state.idx when present (BrowserRouter)', () => {
    window.history.replaceState({ idx: 0, key: 'abc' }, '', '/tests/7')
    expect(canGoBackInApp('abc')).toBe(false)

    window.history.replaceState({ idx: 2, key: 'abc' }, '', '/tests/7')
    expect(canGoBackInApp('abc')).toBe(true)
  })

  it('falls back to location.key when window.history.state.idx is absent (MemoryRouter)', () => {
    window.history.replaceState(null, '', '/tests/7')
    expect(canGoBackInApp('default')).toBe(false)
    expect(canGoBackInApp('k123')).toBe(true)
  })

  it('calls navigate(-1) when history exists, otherwise replaces with fallback', () => {
    const navigate = vi.fn()

    window.history.replaceState({ idx: 1 }, '', '/tests/7')
    navigateBackOrFallback(navigate, 'default', '/tests')
    expect(navigate).toHaveBeenCalledWith(-1)

    navigate.mockReset()
    window.history.replaceState({ idx: 0 }, '', '/tests/7')
    navigateBackOrFallback(navigate, 'k123', '/tests')
    expect(navigate).toHaveBeenCalledWith('/tests', { replace: true })
  })
})
