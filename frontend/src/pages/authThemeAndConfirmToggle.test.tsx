import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from './Login'
import RegisterPage from './Register'
import InstructionScreen from '../components/test/InstructionScreen'
import TestHeader from '../components/test/TestHeader'
import { ThemeProvider } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import type { TestDetail } from '../types/api'

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }))

const mockedUseAuth = vi.mocked(useAuth)

const sampleTest: TestDetail = {
  id: 10,
  title: 'GATE CS Mock 1',
  description: null,
  duration_minutes: 180,
  total_marks: 100,
  question_count: 65,
  series_id: null,
  created_at: '2026-01-01T00:00:00Z',
  test_type: 'full_length',
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  mockedUseAuth.mockReturnValue({
    user: null,
    loading: false,
    saveUser: vi.fn(() => ({ id: 1, email: 'user@example.com', role: 'aspirant', full_name: 'Test User' })),
    logout: vi.fn(async () => {}),
    sessionExpired: false,
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Theme toggle and auth page consistency', () => {
  it('renders a working Dark/Light toggle and unified split layout on /login', () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>
    )

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(screen.getByText('MCQ')).toBeInTheDocument()
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: 'Toggle theme' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(toggle)

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders matching split layout, theme toggle, sentence-case labels, and Confirm password visibility toggle on /register', () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      </ThemeProvider>
    )

    expect(screen.getByText('MCQ')).toBeInTheDocument()
    expect(screen.getByLabelText('Full name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()

    const toggleTheme = screen.getByRole('button', { name: 'Toggle theme' })
    fireEvent.click(toggleTheme)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    const confirmInput = screen.getByLabelText('Confirm password')
    expect(confirmInput).toHaveAttribute('type', 'password')

    const confirmToggle = screen.getByRole('button', { name: 'Toggle confirm password visibility' })
    expect(confirmToggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(confirmToggle)

    expect(confirmInput).toHaveAttribute('type', 'text')
    expect(confirmToggle).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders theme toggle and accessible stat boxes / disabled Begin Test button on /tests/:id instructions', () => {
    render(
      <ThemeProvider>
        <InstructionScreen
          accepted={false}
          beginTest={vi.fn(async () => {})}
          navigate={vi.fn()}
          setAccepted={vi.fn()}
          starting={false}
          test={sampleTest}
        />
      </ThemeProvider>
    )

    const toggle = screen.getByRole('button', { name: 'Toggle theme' })
    fireEvent.click(toggle)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    const durationBox = screen.getByText('Duration').parentElement
    expect(durationBox).toHaveClass('bg-muted', 'border-border')

    const beginButton = screen.getByRole('button', { name: 'Begin Test' })
    expect(beginButton).toBeDisabled()
    expect(beginButton).toHaveClass(
      'disabled:opacity-100',
      'disabled:bg-[var(--btn-disabled-bg)]',
      'disabled:text-[var(--btn-disabled-fg)]',
      'hover:bg-[var(--primary-hover)]',
    )
  })

  it('keeps high-contrast disabled styling on Starting Test loading state', () => {
    render(
      <ThemeProvider>
        <InstructionScreen
          accepted={true}
          beginTest={vi.fn(async () => {})}
          navigate={vi.fn()}
          setAccepted={vi.fn()}
          starting={true}
          test={sampleTest}
        />
      </ThemeProvider>
    )

    const startingBtn = screen.getByRole('button', { name: 'Starting Test...' })
    expect(startingBtn).toBeDisabled()
    expect(startingBtn).toHaveClass(
      'disabled:opacity-100',
      'disabled:bg-[var(--btn-disabled-bg)]',
      'disabled:text-[var(--btn-disabled-fg)]',
    )
  })

  it('renders theme toggle in active exam TestHeader', () => {
    render(
      <ThemeProvider>
        <TestHeader
          attemptNumber={1}
          endTimeMs={Date.now() + 60000}
          handleTimerExpire={vi.fn()}
          maxAttempts={5}
          onSubmitClick={vi.fn()}
          setShowCalc={vi.fn()}
          showCalc={false}
          submitting={false}
          test={sampleTest}
          totalViolations={0}
        />
      </ThemeProvider>
    )

    const toggle = screen.getByRole('button', { name: 'Toggle theme' })
    fireEvent.click(toggle)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
