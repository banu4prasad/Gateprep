import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import type { PersistedResultAnswer } from '../types/api'
import { AnswerStatusIcon } from './Result'

afterEach(() => {
  cleanup()
})

function makeAnswer(is_correct: boolean | null): PersistedResultAnswer {
  return {
    question_id: 1,
    question_type: 'mcq',
    question_text: 'Sample question',
    question_image_url: null,
    options: ['A', 'B'],
    option_images: null,
    correct_answer: 'A',
    selected_answer: is_correct === null ? null : is_correct ? 'A' : 'B',
    is_correct,
    marks: 1,
    marks_awarded: is_correct ? 1 : 0,
    negative_marks: 0,
    time_spent_seconds: 10,
    topper_answer: null,
    topper_time_seconds: 5,
  }
}

describe('AnswerStatusIcon accessibility', () => {
  it('exposes screen-reader status labels for correct, incorrect, and skipped answers', () => {
    const { rerender } = render(<AnswerStatusIcon qa={makeAnswer(true)} />)
    expect(screen.getByText('Correct')).toBeInTheDocument()

    rerender(<AnswerStatusIcon qa={makeAnswer(false)} />)
    expect(screen.getByText('Incorrect')).toBeInTheDocument()

    rerender(<AnswerStatusIcon qa={makeAnswer(null)} />)
    expect(screen.getByText('Skipped')).toBeInTheDocument()
  })
})
