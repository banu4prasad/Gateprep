import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { NONE_SUBJECT_PARAM, useTestNavigation } from './useTestNavigation'
import type { TestCatalogItem } from '@/types/api'

const sampleTests: TestCatalogItem[] = [
  {
    id: 1,
    title: 'OS Quiz',
    description: null,
    duration_minutes: 30,
    question_count: 15,
    total_marks: 25,
    created_at: '2026-01-01T00:00:00Z',
    series_id: null,
    series_name: null,
    test_type: null,
    subject: 'Operating Systems',
    category: 'weekly_quiz',
  },
  {
    id: 2,
    title: 'Unassigned Weekly Quiz',
    description: null,
    duration_minutes: 30,
    question_count: 15,
    total_marks: 25,
    created_at: '2026-01-01T00:00:00Z',
    series_id: null,
    series_name: null,
    test_type: null,
    subject: null,
    category: 'weekly_quiz',
  },
  {
    id: 3,
    title: 'Literal General Subject Quiz',
    description: null,
    duration_minutes: 30,
    question_count: 15,
    total_marks: 25,
    created_at: '2026-01-01T00:00:00Z',
    series_id: null,
    series_name: null,
    test_type: null,
    subject: 'General',
    category: 'weekly_quiz',
  },
  {
    id: 4,
    title: 'GO Classes Algorithms Topic Test',
    description: null,
    duration_minutes: 45,
    question_count: 20,
    total_marks: 30,
    created_at: '2026-01-01T00:00:00Z',
    series_id: 1,
    series_name: 'go_classes',
    test_type: 'topic_wise',
    subject: 'Algorithms',
    category: 'test_series',
  },
  {
    id: 5,
    title: 'Made Easy Full Length 1',
    description: null,
    duration_minutes: 180,
    question_count: 65,
    total_marks: 100,
    created_at: '2026-01-01T00:00:00Z',
    series_id: 2,
    series_name: 'made_easy',
    test_type: 'full_length',
    subject: null,
    category: 'test_series',
  },
]

afterEach(() => {
  cleanup()
})

describe('useTestNavigation URL sync', () => {
  it('hydrates deep nested state directly from URL search params', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/tests?category=test_series&series=go_classes&type=topic_wise&subject=Algorithms']}>
        {children}
      </MemoryRouter>
    )

    const { result } = renderHook(() => useTestNavigation(sampleTests), { wrapper })

    expect(result.current.nav).toEqual([
      { type: 'category', value: 'test_series' },
      { type: 'series', value: 'go_classes' },
      { type: 'type', value: 'topic_wise' },
      { type: 'subject', value: 'Algorithms' },
    ])
    expect(result.current.breadcrumbs).toEqual(['Tests', 'Test Series', 'GO Classes', 'Topic Wise', 'Algorithms'])
    expect(result.current.filteredTests.map(t => t.id)).toEqual([4])
  })

  it('uses _none sentinel for General (null subject) without colliding with a literal "General" subject', () => {
    const wrapperNone = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={[`/tests?category=weekly_quiz&subject=${NONE_SUBJECT_PARAM}`]}>
        {children}
      </MemoryRouter>
    )
    const { result: noneResult } = renderHook(() => useTestNavigation(sampleTests), { wrapper: wrapperNone })
    expect(noneResult.current.breadcrumbs).toEqual(['Tests', 'Weekly Quiz', 'General'])
    expect(noneResult.current.filteredTests.map(t => t.id)).toEqual([2])

    const wrapperLiteral = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/tests?category=weekly_quiz&subject=General']}>
        {children}
      </MemoryRouter>
    )
    const { result: literalResult } = renderHook(() => useTestNavigation(sampleTests), { wrapper: wrapperLiteral })
    expect(literalResult.current.filteredTests.map(t => t.id)).toEqual([3])
  })

  it('replaces junk or mismatched params with the canonical URL and renders root/valid prefix', async () => {
    function Harness() {
      const location = useLocation()
      const { nav, push, goBack } = useTestNavigation(sampleTests)
      return (
        <div>
          <output data-testid="search">{location.search}</output>
          <output data-testid="nav">{JSON.stringify(nav)}</output>
          <button onClick={() => push('category', 'test_series')}>Push TS</button>
          <button onClick={() => goBack(0)}>Root</button>
        </div>
      )
    }

    render(
      <MemoryRouter initialEntries={['/tests?series=go_classes']}>
        <Harness />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(''))
    expect(screen.getByTestId('nav')).toHaveTextContent('[]')

    cleanup()

    render(
      <MemoryRouter initialEntries={['/tests?category=test_series&series=made_easy&type=full_length&subject=Algorithms']}>
        <Harness />
      </MemoryRouter>,
    )

    await waitFor(() =>
      expect(screen.getByTestId('search')).toHaveTextContent('?category=test_series&series=made_easy&type=full_length'),
    )

    fireEvent.click(screen.getByText('Root'))
    expect(screen.getByTestId('search')).toHaveTextContent('')
  })

  it('updates search params on push and goBack', () => {
    function Harness() {
      const location = useLocation()
      const { push, goBack, breadcrumbs } = useTestNavigation(sampleTests)
      return (
        <div>
          <output data-testid="search">{location.search}</output>
          <output data-testid="crumbs">{breadcrumbs.join('>')}</output>
          <button onClick={() => push('category', 'weekly_quiz')}>Go WQ</button>
          <button onClick={() => push('subject', 'Operating Systems')}>Go OS</button>
          <button onClick={() => goBack(1)}>Back 1</button>
        </div>
      )
    }

    render(
      <MemoryRouter initialEntries={['/tests']}>
        <Harness />
      </MemoryRouter>,
    )

    act(() => {
      fireEvent.click(screen.getByText('Go WQ'))
    })
    expect(screen.getByTestId('search')).toHaveTextContent('?category=weekly_quiz')

    act(() => {
      fireEvent.click(screen.getByText('Go OS'))
    })
    expect(screen.getByTestId('search')).toHaveTextContent('?category=weekly_quiz&subject=Operating+Systems')
    expect(screen.getByTestId('crumbs')).toHaveTextContent('Tests>Weekly Quiz>Operating Systems')

    act(() => {
      fireEvent.click(screen.getByText('Back 1'))
    })
    expect(screen.getByTestId('search')).toHaveTextContent('?category=weekly_quiz')
  })
})
