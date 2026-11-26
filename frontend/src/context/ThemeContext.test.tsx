import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from './ThemeContext'

function ThemeConsumer() {
  const ctx = useTheme()
  if (!ctx) {
    return <span data-testid="theme">null</span>
  }
  const { theme, toggle } = ctx
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button data-testid="toggle-btn" onClick={toggle}>Toggle</button>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.style.colorScheme = ''
})

afterEach(() => {
  cleanup()
})

describe('ThemeProvider', () => {
  it('defaults to "dark" when localStorage has no saved theme', () => {
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)

    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('restores saved theme from localStorage', () => {
    localStorage.setItem('theme', 'light')

    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)

    expect(screen.getByTestId('theme').textContent).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('toggles from dark to light', async () => {
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)

    expect(screen.getByTestId('theme').textContent).toBe('dark')

    await act(async () => {
      await userEvent.click(screen.getByTestId('toggle-btn'))
    })

    expect(screen.getByTestId('theme').textContent).toBe('light')
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('toggles from light back to dark', async () => {
    localStorage.setItem('theme', 'light')

    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)

    await act(async () => {
      await userEvent.click(screen.getByTestId('toggle-btn'))
    })

    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('sets colorScheme on the document element', () => {
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)

    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('suppresses CSS transitions briefly during theme toggles to avoid button color flashes', async () => {
    const rafCallbacks: FrameRequestCallback[] = []
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      rafCallbacks.push(callback)
      return rafCallbacks.length
    })
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    try {
      const { unmount } = render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
      expect(document.documentElement.classList.contains('theme-switching')).toBe(false)

      await act(async () => {
        await userEvent.click(screen.getByTestId('toggle-btn'))
      })

      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
      expect(document.documentElement.classList.contains('theme-switching')).toBe(true)
      expect(rafCallbacks).toHaveLength(1)

      act(() => {
        rafCallbacks[0](16)
      })
      expect(document.documentElement.classList.contains('theme-switching')).toBe(true)
      expect(rafCallbacks).toHaveLength(2)

      act(() => {
        rafCallbacks[1](32)
      })
      expect(document.documentElement.classList.contains('theme-switching')).toBe(false)

      await act(async () => {
        await userEvent.click(screen.getByTestId('toggle-btn'))
      })
      expect(document.documentElement.classList.contains('theme-switching')).toBe(true)

      unmount()
      expect(cancelSpy).toHaveBeenCalled()
      expect(document.documentElement.classList.contains('theme-switching')).toBe(false)
    } finally {
      rafSpy.mockRestore()
      cancelSpy.mockRestore()
    }
  })
})

describe('useTheme', () => {
  it('returns null when used outside ThemeProvider', () => {
    // useTheme uses raw useContext without a guard, so it returns null outside provider
    function Naked() {
      const ctx = useTheme()
      return <span data-testid="ctx">{String(ctx)}</span>
    }

    render(<Naked />)
    expect(screen.getByTestId('ctx').textContent).toBe('null')
  })
})
