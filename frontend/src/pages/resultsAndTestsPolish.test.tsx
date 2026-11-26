import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import useSWR from 'swr'
import MyResults from './MyResults'
import BookmarksPage from './Bookmarks'
import TestsPage from './Tests'
import { ThemeProvider } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import type { TestCatalogItem } from '../types/api'

vi.mock('swr', () => ({ default: vi.fn() }))
vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }))

const mockedUseSWR = vi.mocked(useSWR)
const mockedUseAuth = vi.mocked(useAuth)

const sampleTests: TestCatalogItem[] = [
  {
    id: 1,
    title: 'Operating Systems Quiz 1',
    description: 'Scheduling',
    duration_minutes: 75,
    question_count: 30,
    total_marks: 40,
    created_at: '2026-01-01T00:00:00Z',
    series_id: null,
    series_name: null,
    test_type: null,
    subject: 'Operating Systems',
    category: 'weekly_quiz',
  },
]

beforeEach(() => {
  mockedUseAuth.mockReturnValue({
    user: { id: 1, email: 'aspirant@example.com', role: 'aspirant', full_name: 'Test Aspirant' },
    loading: false,
    saveUser: vi.fn((u) => u),
    logout: vi.fn(async () => {}),
    sessionExpired: false,
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function swrResult(data: unknown): ReturnType<typeof useSWR> {
  return {
    data,
    error: undefined,
    mutate: vi.fn(),
    isValidating: false,
    isLoading: false,
  }
}

describe('MyResults and Tests layout polish', () => {
  it('centers My Results header and empty-state container on /results', () => {
    mockedUseSWR.mockImplementation(() => swrResult([]))

    render(
      <ThemeProvider>
        <MemoryRouter>
          <MyResults />
        </MemoryRouter>
      </ThemeProvider>
    )

    const heading = screen.getByRole('heading', { name: 'My Results' })
    const wrapper = heading.closest('.max-w-2xl')
    expect(wrapper).toHaveClass('mx-auto')
    expect(screen.getByText('No completed tests yet')).toBeInTheDocument()
  })

  it('uses unified bg-card surface without inline background overrides on Results and Bookmarks empty cards', () => {
    mockedUseSWR.mockImplementation(() => swrResult([]))

    const { container: resultsContainer, unmount } = render(
      <ThemeProvider>
        <MemoryRouter>
          <MyResults />
        </MemoryRouter>
      </ThemeProvider>
    )
    const resultsCard = resultsContainer.querySelector('[data-slot="card"]')
    expect(resultsCard).toHaveClass('bg-card', 'duration-200')
    expect(resultsCard).not.toHaveAttribute('style')
    expect(resultsContainer.querySelector('.min-h-screen')).toHaveClass('transition-colors', 'duration-200')
    unmount()

    const { container: bookmarksContainer } = render(
      <ThemeProvider>
        <MemoryRouter>
          <BookmarksPage />
        </MemoryRouter>
      </ThemeProvider>
    )
    const bookmarksCard = bookmarksContainer.querySelector('[data-slot="card"]')
    expect(bookmarksCard).toHaveClass('bg-card', 'duration-200')
    expect(bookmarksCard).not.toHaveAttribute('style')
    expect(screen.getByRole('link', { name: 'Go to Tests' })).toHaveClass(
      'bg-primary',
      'text-primary-foreground',
      'hover:bg-[var(--primary-hover)]',
    )
  })

  it('renders clear section headings on nested /tests views, syncs URL query params, and preserves state on reload', () => {
    mockedUseSWR.mockImplementation((key) => {
      if (key === '/tests') return swrResult(sampleTests)
      return swrResult([])
    })

    function LocationSpy() {
      const location = useLocation()
      return <output data-testid="tests-url">{`${location.pathname}${location.search}`}</output>
    }

    const { unmount } = render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/tests']}>
          <LocationSpy />
          <TestsPage />
        </MemoryRouter>
      </ThemeProvider>
    )

    expect(screen.getByRole('heading', { name: 'Tests', level: 1 })).toBeInTheDocument()

    fireEvent.click(screen.getByText('Weekly Quiz'))
    expect(screen.getByRole('heading', { name: 'Weekly Quiz', level: 1 })).toBeInTheDocument()
    expect(screen.getByTestId('tests-url')).toHaveTextContent('/tests?category=weekly_quiz')

    fireEvent.click(screen.getByText('Operating Systems'))
    expect(screen.getByRole('heading', { name: 'Operating Systems', level: 1 })).toBeInTheDocument()
    const currentUrl = screen.getByTestId('tests-url').textContent || ''
    expect(currentUrl).toBe('/tests?category=weekly_quiz&subject=Operating+Systems')
    expect(screen.getByText('75 min')).toBeInTheDocument()
    expect(screen.getByText('30 questions')).toBeInTheDocument()
    expect(screen.getByText('40 marks')).toBeInTheDocument()
    expect(screen.queryByText('75m')).not.toBeInTheDocument()
    expect(screen.queryByText('30 Qs')).not.toBeInTheDocument()

    // Simulate reload at the synced URL
    unmount()
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={[currentUrl]}>
          <TestsPage />
        </MemoryRouter>
      </ThemeProvider>
    )
    expect(screen.getByRole('heading', { name: 'Operating Systems', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Operating Systems Quiz 1')).toBeInTheDocument()
  })
})
