import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { cn } from '@/lib/utils'

export interface ThemeToggleProps {
  className?: string
}

/** Toggles between dark and light themes when rendered inside a ThemeProvider. */
export default function ThemeToggle({ className }: ThemeToggleProps): React.ReactElement | null {
  const themeContext = useTheme()
  if (!themeContext) return null
  const { theme, toggle } = themeContext

  return (
    <button
      type="button"
      onClick={toggle}
      title="Toggle theme"
      aria-label="Toggle theme"
      aria-pressed={theme === 'light'}
      className={cn(
        'inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </button>
  )
}
