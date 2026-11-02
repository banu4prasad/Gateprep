import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
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
      notAnswered={questions.length}
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

describe('TestSidebar full-length sections', () => {
  it('shows Part A and Part B without subject headings for full-length tests', () => {
    renderSidebar(true)

    expect(screen.queryByText('Part A')).toBeTruthy()
    expect(screen.queryByText('Part B')).toBeTruthy()
    expect(screen.queryByText('Algorithms')).toBeNull()
    expect(screen.queryByText('Databases')).toBeNull()
    expect(screen.queryByText(GENERAL_APTITUDE_SUBJECT)).toBeNull()
    expect(screen.getAllByRole('button').slice(0, questions.length).map((button) => button.textContent)).toEqual([
      '2',
      '1',
      '3',
    ])
  })

  it('shows subject headings for other test types', () => {
    renderSidebar(false)

    expect(screen.queryByText('Part A')).toBeNull()
    expect(screen.queryByText('Algorithms')).toBeTruthy()
    expect(screen.queryByText('Databases')).toBeTruthy()
    expect(screen.queryByText(GENERAL_APTITUDE_SUBJECT)).toBeTruthy()
  })
})
