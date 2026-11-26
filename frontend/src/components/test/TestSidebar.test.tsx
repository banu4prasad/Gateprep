import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TestSidebar from './TestSidebar'
import type { QuestionGroup, QuestionGroups } from './TestSidebar'
import { GENERAL_APTITUDE_SUBJECT } from '../../utils/constants'
import type { TestQuestion } from '@/types/api'

const questions: TestQuestion[] = [
  {
    id: 1,
    question_type: 'mcq',
    question_text: 'Algorithm question',
    question_image_url: null,
    options: ['A', 'B'],
    option_images: null,
    order_index: 0,
    marks: 1,
    negative_marks: 0,
    subject: 'Algorithms',
    topic: null,
  },
  {
    id: 2,
    question_type: 'mcq',
    question_text: 'Aptitude question',
    question_image_url: null,
    options: ['A', 'B'],
    option_images: null,
    order_index: 1,
    marks: 1,
    negative_marks: 0,
    subject: GENERAL_APTITUDE_SUBJECT,
    topic: null,
  },
  {
    id: 3,
    question_type: 'mcq',
    question_text: 'Database question',
    question_image_url: null,
    options: ['A', 'B'],
    option_images: null,
    order_index: 2,
    marks: 1,
    negative_marks: 0,
    subject: 'Databases',
    topic: null,
  },
]

const questionGroups: QuestionGroups = new Map<string, QuestionGroup[]>([
  [GENERAL_APTITUDE_SUBJECT, [{ question: questions[1], index: 1 }]],
  ['Databases', [{ question: questions[2], index: 2 }]],
  ['Algorithms', [{ question: questions[0], index: 0 }]],
])

function renderSidebar(isFullLength: boolean): void {
  render(
    <TestSidebar
      answered={0}
      answers={{}}
      currentQuestion={questions[0]}
      marked={new Set()}
      notAnswered={0}
      notVisited={questions.length}
      onQuestionSelect={() => undefined}
      onSubmitClick={() => undefined}
      questionGroups={questionGroups}
      questions={questions}
      submitting={false}
      visited={new Set()}
      isFullLength={isFullLength}
    />,
  )
}

afterEach(() => {
  cleanup()
})

describe('TestSidebar section rendering', () => {
  it('shows General Aptitude and Core Subject sections without individual subject headings or Part A/B for full-length tests', () => {
    renderSidebar(true)

    expect(screen.getByText('General Aptitude')).toBeInTheDocument()
    expect(screen.getByText('Core Subject')).toBeInTheDocument()
    expect(screen.queryByText('Part A')).toBeNull()
    expect(screen.queryByText('Part B')).toBeNull()
    expect(screen.queryByText('Algorithms')).toBeNull()
    expect(screen.queryByText('Databases')).toBeNull()
    expect(screen.getAllByRole('button').slice(0, questions.length).map((button) => button.textContent)).toEqual([
      '2',
      '1',
      '3',
    ])
  })

  it('renders a unified palette without Part A / Part B for single-section tests', () => {
    renderSidebar(false)

    expect(screen.queryByText('Part A')).toBeNull()
    expect(screen.queryByText('Part B')).toBeNull()
    expect(screen.queryByText('General Aptitude')).toBeNull()
    expect(screen.queryByText('Core Subject')).toBeNull()
    expect(screen.getAllByRole('button').slice(0, questions.length).map((button) => button.textContent)).toEqual([
      '1',
      '2',
      '3',
    ])
  })

  it('renders a single section header with subject name for subject-wise tests', () => {
    const subjectQuestions: TestQuestion[] = [
      { ...questions[0], id: 10, subject: 'Algorithms' },
      { ...questions[0], id: 11, subject: 'Algorithms', order_index: 1 },
    ]
    render(
      <TestSidebar
        answered={0}
        answers={{}}
        currentQuestion={subjectQuestions[0]}
        marked={new Set()}
        notAnswered={2}
        notVisited={0}
        onQuestionSelect={() => undefined}
        onSubmitClick={() => undefined}
        questionGroups={new Map()}
        questions={subjectQuestions}
        submitting={false}
        visited={new Set()}
        isFullLength={false}
      />
    )
    expect(screen.getByText('Algorithms')).toBeInTheDocument()
    expect(screen.queryByText('Part A')).toBeNull()
    expect(screen.queryByText('Part B')).toBeNull()
    expect(screen.queryByText('General Aptitude')).toBeNull()
    expect(screen.queryByText('Core Subject')).toBeNull()
  })

  it('calls onToggleCollapse when collapse button is clicked', () => {
    const onToggleCollapse = vi.fn()
    render(
      <TestSidebar
        answered={0}
        answers={{}}
        currentQuestion={questions[0]}
        marked={new Set()}
        notAnswered={3}
        notVisited={0}
        onQuestionSelect={() => undefined}
        onSubmitClick={() => undefined}
        questionGroups={new Map()}
        questions={questions}
        submitting={false}
        visited={new Set()}
        candidateName="Aspirant 1"
        onToggleCollapse={onToggleCollapse}
      />
    )
    expect(screen.getByText('Aspirant 1')).toBeInTheDocument()
    const collapseBtn = screen.getByRole('button', { name: 'Collapse sidebar' })
    expect(collapseBtn).toBeInTheDocument()
    collapseBtn.click()
    expect(onToggleCollapse).toHaveBeenCalledOnce()
  })

  it('keeps each active question status fill color and adds the active ring class instead of turning green', () => {
    const { rerender } = render(
      <TestSidebar
        answered={0}
        answers={{}}
        currentQuestion={questions[0]}
        marked={new Set()}
        notAnswered={1}
        notVisited={2}
        onQuestionSelect={() => undefined}
        onSubmitClick={() => undefined}
        questionGroups={new Map()}
        questions={questions}
        submitting={false}
        visited={new Set([1])}
        isFullLength={false}
      />
    )

    const q1Unanswered = screen.getByRole('button', { name: '1' })
    expect(q1Unanswered).toHaveClass('q-dot', 'q-dot-not-answered', 'q-dot-active')
    expect(q1Unanswered).not.toHaveClass('q-dot-answered')
    expect(q1Unanswered).toHaveAttribute('aria-current', 'step')

    const q2NotVisited = screen.getByRole('button', { name: '2' })
    expect(q2NotVisited).toHaveClass('q-dot', 'q-dot-not-visited')
    expect(q2NotVisited).not.toHaveClass('q-dot-active')
    expect(q2NotVisited).not.toHaveAttribute('aria-current')

    rerender(
      <TestSidebar
        answered={1}
        answers={{ 1: 'A' }}
        currentQuestion={questions[1]}
        marked={new Set([2])}
        notAnswered={1}
        notVisited={1}
        onQuestionSelect={() => undefined}
        onSubmitClick={() => undefined}
        questionGroups={new Map()}
        questions={questions}
        submitting={false}
        visited={new Set([1, 2])}
        isFullLength={false}
      />
    )

    const q1Answered = screen.getByRole('button', { name: '1' })
    expect(q1Answered).toHaveClass('q-dot-answered')
    expect(q1Answered).not.toHaveClass('q-dot-active')

    const q2MarkedActive = screen.getByRole('button', { name: '2' })
    expect(q2MarkedActive).toHaveClass('q-dot-marked', 'q-dot-active')
    expect(q2MarkedActive).not.toHaveClass('q-dot-answered')

    rerender(
      <TestSidebar
        answered={1}
        answers={{ 1: 'A' }}
        currentQuestion={questions[0]}
        marked={new Set([2])}
        notAnswered={1}
        notVisited={1}
        onQuestionSelect={() => undefined}
        onSubmitClick={() => undefined}
        questionGroups={new Map()}
        questions={questions}
        submitting={false}
        visited={new Set([1, 2])}
        isFullLength={false}
      />
    )

    const q1AnsweredActive = screen.getByRole('button', { name: '1' })
    expect(q1AnsweredActive).toHaveClass('q-dot-answered', 'q-dot-active')
    expect(screen.getByRole('button', { name: '2' })).toHaveClass('q-dot-marked')
  })

  it('paints an answered-but-unvisited question as answered rather than not-visited', () => {
    render(
      <TestSidebar
        answered={1}
        answers={{ 3: 'B' }}
        currentQuestion={questions[0]}
        marked={new Set()}
        notAnswered={1}
        notVisited={1}
        onQuestionSelect={() => undefined}
        onSubmitClick={() => undefined}
        questionGroups={new Map()}
        questions={questions}
        submitting={false}
        visited={new Set([1])}
        isFullLength={false}
      />
    )

    expect(screen.getByRole('button', { name: '3' })).toHaveClass('q-dot-answered')
    expect(screen.getByRole('button', { name: '3' })).not.toHaveClass('q-dot-not-visited')
  })
})
