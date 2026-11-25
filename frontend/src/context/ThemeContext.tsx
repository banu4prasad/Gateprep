import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.style.colorScheme = theme
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme)
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // Ignore storage write failures when site storage is restricted.
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
