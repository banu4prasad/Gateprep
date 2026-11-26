import { fireEvent, render, screen, waitFor, cleanup, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { AxiosHeaders } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import TestEngine from './TestEngine'
import { adminAPI, testAPI } from '../api/api'
import type { AdminQuestion, ApiResponse, AttemptStart, TestDetail, TestQuestion } from '@/types/api'

vi.mock('../api/api', () => ({
  adminAPI: {
    getQuestions: vi.fn(),
  },
  testAPI: {
    getTest: vi.fn(),
    startTest: vi.fn(),
    getQuestions: vi.fn(),
    saveAnswers: vi.fn(),
    submitTest: vi.fn(),
    updateViolations: vi.fn(),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
}))

const testData: TestDetail = {
  id: 7,
  title: 'Flow Test',
  description: null,
  duration_minutes: 60,
  total_marks: 2,
  question_count: 2,
  series_id: null,
  created_at: '2026-11-01T10:00:00Z',
  test_type: null,
}

const questions: TestQuestion[] = [
  {
    id: 11,
    question_type: 'mcq',
    question_text: 'Which option?',
    question_image_url: null,
    options: ['Alpha', 'Beta'],
    option_images: null,
    order_index: 0,
    marks: 1,
    negative_marks: 0,
    subject: 'Computer Science',
    topic: null,
  },
  {
    id: 12,
    question_type: 'mcq',
    question_text: 'Second question?',
    question_image_url: null,
    options: ['Gamma', 'Delta'],
    option_images: null,
    order_index: 1,
    marks: 1,
    negative_marks: 0,
    subject: 'Computer Science',
    topic: null,
  },
]

const adminQuestions: AdminQuestion[] = [
  {
    id: 11,
    question_type: 'mcq',
    question_text: 'Which option?',
    question_image_url: null,
    options: ['Alpha', 'Beta'],
    option_images: null,
    order_index: 0,
    marks: 1,
    negative_marks: 0,
    subject: 'Computer Science',
    topic: null,
    correct_answer: 'A',
  },
  {
    id: 12,
    question_type: 'mcq',
    question_text: 'Second question?',
    question_image_url: null,
    options: ['Gamma', 'Delta'],
    option_images: null,
    order_index: 1,
    marks: 1,
    negative_marks: 0,
    subject: 'Computer Science',
    topic: null,
    correct_answer: 'A',
  },
]

const attempt: AttemptStart = {
  id: 31,
  test_id: 7,
  status: 'in_progress',
  started_at: '2026-11-01T10:00:00Z',
  submitted_at: null,
  score: null,
  total_marks: null,
  tab_violations: 0,
  fullscreen_violations: 0,
  server_time: '2026-11-01T10:00:00Z',
  answers: [],
  attempt_number: 1,
  max_attempts: 6,
}

function response<T>(data: T): ApiResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
}

function LocationProbe(): React.ReactElement {
  const location = useLocation()
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>
}

function renderPage(entries: string | string[] = '/tests/7'): void {
  const initialEntries = Array.isArray(entries) ? entries : [entries]
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/tests/:testId" element={<TestEngine />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function beginExam(): Promise<void> {
  await waitFor(() => expect(screen.getByRole('heading', { name: 'General Instructions' })).toBeInTheDocument())
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: 'Begin Test' }))
  await waitFor(() => expect(screen.getByText('Question No. 1')).toBeInTheDocument())
}

beforeEach(() => {
  vi.mocked(testAPI.getTest).mockResolvedValue(response(testData))
  vi.mocked(testAPI.startTest).mockResolvedValue(response(attempt))
  vi.mocked(testAPI.getQuestions).mockResolvedValue(response(questions))
  vi.mocked(adminAPI.getQuestions).mockResolvedValue(response(adminQuestions))
  vi.mocked(testAPI.saveAnswers).mockResolvedValue(response({ message: 'Saved' }))
  vi.mocked(testAPI.submitTest).mockResolvedValue(response({
    id: 31,
    test_id: 7,
    status: 'submitted',
    started_at: attempt.started_at,
    submitted_at: '2026-11-01T10:30:00Z',
    score: 1,
    total_marks: 2,
    tab_violations: 0,
    fullscreen_violations: 0,
    persisted: true,
  }))
  vi.mocked(testAPI.updateViolations).mockResolvedValue(response({ message: 'Updated' }))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('TestEngine page flow', () => {
  it('loads the test and shows instructions before an attempt starts', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByRole('heading', { name: 'General Instructions' })).toBeInTheDocument())
    expect(screen.queryByText('Question No. 1')).not.toBeInTheDocument()
    expect(testAPI.getTest).toHaveBeenCalledExactlyOnceWith('7')
  })

  it('starts an attempt in API order and shows the first question', async () => {
    renderPage()
    await beginExam()

    expect(testAPI.getTest).toHaveBeenCalledBefore(vi.mocked(testAPI.startTest))
    expect(vi.mocked(testAPI.startTest)).toHaveBeenCalledBefore(vi.mocked(testAPI.getQuestions))
    expect(testAPI.getTest).toHaveBeenCalledExactlyOnceWith('7')
    expect(testAPI.startTest).toHaveBeenCalledExactlyOnceWith('7')
    expect(testAPI.getQuestions).toHaveBeenCalledExactlyOnceWith('7', 31)
  })

  it('submits selected and unanswered answers after review and palette navigation', async () => {
    renderPage()
    await beginExam()

    fireEvent.click(screen.getByRole('button', { name: /Mark & Next/ }))
    fireEvent.click(screen.getAllByRole('radio')[0])
    await waitFor(() => expect(screen.getAllByRole('radio')[0]).toHaveAttribute('aria-checked', 'true'))
    fireEvent.click(screen.getAllByRole('button', { name: /^Q2\/2$/ })[0])
    fireEvent.click(screen.getAllByRole('button', { name: /^1$/ })[0])
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Question Palette' })).not.toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /Submit Test|Submit/ })[0])
    fireEvent.click(screen.getByRole('button', { name: /^Submit$/ }))

    await waitFor(() => expect(testAPI.submitTest).toHaveBeenCalledExactlyOnceWith('7', 31, [
      { question_id: 11, selected_answer: null, time_spent_seconds: 0 },
      { question_id: 12, selected_answer: 'A', time_spent_seconds: 0 },
    ]))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/results/31'))
  })

  it('shows the empty-questions screen without rendering QuestionView', async () => {
    vi.mocked(testAPI.getQuestions).mockResolvedValue(response([]))
    renderPage()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'General Instructions' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Begin Test' }))
    await waitFor(() => expect(screen.getByText('No Questions Available')).toBeInTheDocument())
    expect(screen.getByText('No Questions Available')).toBeInTheDocument()
    expect(screen.queryByText('Question No. 1')).not.toBeInTheDocument()
  })

  it('uses admin questions and admin navigation in preview mode', async () => {
    renderPage('/tests/7?preview=true')
    await beginExam()

    expect(adminAPI.getQuestions).toHaveBeenCalledExactlyOnceWith('7')
    expect(testAPI.startTest).not.toHaveBeenCalled()
    expect(testAPI.saveAnswers).not.toHaveBeenCalled()
    expect(testAPI.submitTest).not.toHaveBeenCalled()

    fireEvent.click(screen.getAllByRole('button', { name: /Submit Test|Submit/ })[0])
    fireEvent.click(screen.getByRole('button', { name: /^Submit$/ }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/admin/tests/7'))
  })

  it('shows inline "Test not found" for non-numeric IDs and 404 responses without redirecting', async () => {
    renderPage('/tests/not-a-valid-id')

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Test not found' })).toBeInTheDocument())
    expect(testAPI.getTest).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/tests'))

    cleanup()
    vi.clearAllMocks()

    vi.mocked(testAPI.getTest).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404, data: { detail: 'Test not found' } },
    })
    renderPage(['/tests?category=test_series&series=go_classes', '/tests/9999'])

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Test not found' })).toBeInTheDocument())
    expect(toast.error).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/tests?category=test_series&series=go_classes'))
  })

  it('shows inline "Failed to load" with Retry and Back on 500 or network errors', async () => {
    vi.mocked(testAPI.getTest)
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce(response(testData))
    renderPage(['/dashboard', '/tests/7'])

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to load test'))
    expect(screen.getByRole('heading', { name: 'Failed to load' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'General Instructions' })).toBeInTheDocument())
  })

  it('uses context-aware Back navigation to previous routes with fallback to /tests or admin preview', async () => {
    renderPage(['/dashboard', '/tests/7'])
    await waitFor(() => expect(screen.getByRole('heading', { name: 'General Instructions' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/dashboard'))

    cleanup()

    renderPage(['/tests?category=weekly_quiz&subject=Operating+Systems', '/tests/7'])
    await waitFor(() => expect(screen.getByRole('heading', { name: 'General Instructions' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/tests?category=weekly_quiz&subject=Operating+Systems'))

    cleanup()

    renderPage('/tests/7')
    await waitFor(() => expect(screen.getByRole('heading', { name: 'General Instructions' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/tests'))

    cleanup()

    renderPage('/tests/7?preview=true')
    await waitFor(() => expect(screen.getByRole('heading', { name: 'General Instructions' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/admin/tests/7'))
  })

  it('records a fullscreen violation after the guarded delay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderPage()
    await beginExam()

    act(() => {
      vi.advanceTimersByTime(2000)
      document.dispatchEvent(new Event('fullscreenchange'))
      vi.advanceTimersByTime(250)
    })

    expect(testAPI.updateViolations).toHaveBeenCalledExactlyOnceWith('7', 31, {
      fullscreen_violations: 1,
    })
  })

  it('autosaves the current answers after thirty seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderPage()
    await beginExam()

    act(() => vi.advanceTimersByTime(30000))

    expect(testAPI.saveAnswers).toHaveBeenCalledExactlyOnceWith('7', 31, [])
  })

  it('toggles scientific calculator from the icon button and does not render subject tabs in header', async () => {
    renderPage()
    await beginExam()

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()

    const calcButton = screen.getByRole('button', { name: 'Calculator' })
    expect(calcButton).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Scientific Calculator' })).not.toBeInTheDocument()

    fireEvent.click(calcButton)
    expect(screen.getByRole('dialog', { name: 'Scientific Calculator' })).toBeInTheDocument()

    fireEvent.click(calcButton)
    expect(screen.queryByRole('dialog', { name: 'Scientific Calculator' })).not.toBeInTheDocument()
  })

  it('renders a single section palette without Part A / Part B for single-section tests', async () => {
    renderPage()
    await beginExam()

    expect(screen.queryByText('Part A')).not.toBeInTheDocument()
    expect(screen.queryByText('Part B')).not.toBeInTheDocument()
    expect(screen.getByText('Computer Science')).toBeInTheDocument()
  })

  it('renders General Aptitude and Core Subject sections in palette for full-length test', async () => {
    vi.mocked(testAPI.getTest).mockResolvedValue(response({
      ...testData,
      test_type: 'full_length',
    }))
    vi.mocked(testAPI.getQuestions).mockResolvedValue(response([
      { ...questions[0], id: 101, subject: 'General Aptitude' },
      { ...questions[1], id: 102, subject: 'Computer Science' },
    ]))
    renderPage()
    await beginExam()

    expect(screen.getByText('General Aptitude')).toBeInTheDocument()
    expect(screen.getByText('Core Subject')).toBeInTheDocument()
    expect(screen.queryByText('Part A')).not.toBeInTheDocument()
    expect(screen.queryByText('Part B')).not.toBeInTheDocument()
  })

  it('renders concise question type "MCQ" without "Single"', async () => {
    renderPage()
    await beginExam()

    expect(screen.getByText('MCQ')).toBeInTheDocument()
    expect(screen.queryByText('MCQ Single')).not.toBeInTheDocument()
  })

  it('collapses and expands the sidebar', async () => {
    renderPage()
    await beginExam()

    expect(screen.queryByRole('button', { name: 'Expand sidebar' })).not.toBeInTheDocument()
    const collapseBtn = screen.getByRole('button', { name: 'Collapse sidebar' })
    fireEvent.click(collapseBtn)

    const expandBtn = screen.getByRole('button', { name: 'Expand sidebar' })
    expect(expandBtn).toBeInTheDocument()

    fireEvent.click(expandBtn)
    expect(screen.queryByRole('button', { name: 'Expand sidebar' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument()
  })
})

describe('TestEngine fullscreen fallback', () => {
  const originalFullscreenEnabled = Object.getOwnPropertyDescriptor(document, 'fullscreenEnabled')
  const originalFullscreenElement = Object.getOwnPropertyDescriptor(document, 'fullscreenElement')
  const originalRequestFullscreen = Object.getOwnPropertyDescriptor(document.documentElement, 'requestFullscreen')

  function restoreDescriptor(target: object, key: string, descriptor: PropertyDescriptor | undefined) {
    if (descriptor) {
      Object.defineProperty(target, key, descriptor)
    } else {
      delete (target as Record<string, unknown>)[key]
    }
  }

  afterEach(() => {
    restoreDescriptor(document, 'fullscreenEnabled', originalFullscreenEnabled)
    restoreDescriptor(document, 'fullscreenElement', originalFullscreenElement)
    restoreDescriptor(document.documentElement, 'requestFullscreen', originalRequestFullscreen)
  })

  it('starts the test with a non-blocking notice when fullscreen is unsupported (iOS Safari)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const requestFullscreen = vi.fn(() => new Promise<void>(() => {}))
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false })
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    })

    renderPage()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'General Instructions' })).toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent(/fullscreen mode is unavailable/i)

    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Begin Test' }))

    await waitFor(() => expect(screen.getByText('Question No. 1')).toBeInTheDocument())
    expect(requestFullscreen).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Starting Test...' })).not.toBeInTheDocument()

    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent(/continuing test without fullscreen/i)

    act(() => vi.advanceTimersByTime(2000))
    expect(screen.queryByText('You exited fullscreen!')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss fullscreen notice' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('does not hang on Starting Test when requestFullscreen never settles', async () => {
    const requestFullscreen = vi.fn(() => new Promise<void>(() => {}))
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    })

    renderPage()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'General Instructions' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Begin Test' }))

    await waitFor(() => expect(screen.getByText('Question No. 1')).toBeInTheDocument())
    expect(requestFullscreen).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Starting Test...' })).not.toBeInTheDocument()
  })

  it('does not throw or trap the user in FullscreenWarning when Return to Fullscreen fails', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: document.documentElement,
    })
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    })

    renderPage()
    await beginExam()

    act(() => vi.advanceTimersByTime(2000))

    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: undefined,
    })

    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'))
      vi.advanceTimersByTime(250)
    })

    await waitFor(() => expect(screen.getByText('You exited fullscreen!')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Return to Fullscreen/i }))
    await waitFor(() => expect(screen.queryByText('You exited fullscreen!')).not.toBeInTheDocument())
  })

  it('dismisses FullscreenWarning after fallback timeout if Return to Fullscreen hangs', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: document.documentElement,
    })
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    })

    renderPage()
    await beginExam()

    act(() => vi.advanceTimersByTime(2000))

    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: vi.fn(() => new Promise<void>(() => {})),
    })

    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'))
      vi.advanceTimersByTime(250)
    })

    await waitFor(() => expect(screen.getByText('You exited fullscreen!')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Return to Fullscreen/i }))

    act(() => vi.advanceTimersByTime(1000))
    await waitFor(() => expect(screen.queryByText('You exited fullscreen!')).not.toBeInTheDocument())
  })

  it('does not show the fullscreen-unavailable notice on InstructionScreen when supported', async () => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('blocked')),
    })

    renderPage()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'General Instructions' })).toBeInTheDocument())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Begin Test' }))

    await waitFor(() => expect(screen.getByText('Question No. 1')).toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent(/continuing test without fullscreen/i)
  })
})
