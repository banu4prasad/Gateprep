import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import QuestionFooter from './QuestionFooter'

afterEach(() => {
  cleanup()
})

describe('QuestionFooter accessibility', () => {
  it('keeps Mark & Next and Prev button names accessible on mobile viewports', () => {
    render(
      <>
        <style>{'.hidden { display: none; }'}</style>
        <QuestionFooter
          current={1}
          isLastQuestion={false}
          setCurrent={vi.fn()}
          markAndNext={vi.fn()}
          clearResponse={vi.fn()}
          saveAndNext={vi.fn()}
        />
      </>
    )

    expect(screen.getByRole('button', { name: 'Mark & Next' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Prev' })).toBeInTheDocument()
  })
})
