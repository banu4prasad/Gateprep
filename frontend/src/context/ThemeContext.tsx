import { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react'

type Theme = 'dark' | 'light'
interface ThemeContextValue {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem('theme')
    return stored === 'light' || stored === 'dark' ? stored : 'dark'
  } catch {
    return 'dark'
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readStoredTheme)
  const prevThemeRef = useRef<Theme>(theme)

  useLayoutEffect(() => {
    const root = document.documentElement
    const isThemeChange = prevThemeRef.current !== theme
    prevThemeRef.current = theme

    let raf1 = 0
    let raf2 = 0

    if (isThemeChange) {
      root.classList.add('theme-switching')
    }

    root.setAttribute('data-theme', theme)
    root.style.colorScheme = theme
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme)
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // Ignore storage write failures when site storage is restricted.
    }

    if (isThemeChange) {
      void root.offsetHeight

      raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => {
          root.classList.remove('theme-switching')
        })
      })
    }

    return () => {
      if (raf1) window.cancelAnimationFrame(raf1)
      if (raf2) window.cancelAnimationFrame(raf2)
      root.classList.remove('theme-switching')
    }
  }, [theme])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'theme') return
      if (event.newValue === 'light' || event.newValue === 'dark') {
        setTheme(event.newValue)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const toggle = useCallback(() => setTheme((currentTheme) => currentTheme === 'dark' ? 'light' : 'dark'), [])
  const value = useMemo(() => ({ theme, toggle }), [theme, toggle])

  return (
    <ThemeContext value={value}>
      {children}
    </ThemeContext>
  )
}

export const useTheme = () => useContext(ThemeContext)
