import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right'
import Flag from 'lucide-react/dist/esm/icons/flag'
import clsx from 'clsx'
import MathText from '../shared/MathText'
import { Button } from '@/components/ui/button'

export default function QuestionView({
  answers,
  clearResponse,
  commitNAT,
  current,
  markAndNext,
  natInput,
  question,
  questions,
  saveAndNext,
  setCurrent,
  setMCQ,
  setNatInput,
  toggleMSQ,
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-3 sm:px-4 py-1.5 text-xs border-b flex items-center flex-wrap gap-2 sm:gap-4 flex-shrink-0 theme-card-surface">
        <span className="theme-muted">
          Question Type:{' '}
          <strong className="theme-text">
            {question.question_type === 'mcq'
              ? 'MCQ Single'
              : question.question_type === 'msq'
                ? 'MSQ Multiple'
                : 'NAT Numerical'}
          </strong>
        </span>
        <span className="theme-muted">
          Marks: <strong className="text-success-text">+{question.marks}</strong>
          {question.negative_marks > 0 && <span className="text-destructive ml-1">/ -{question.negative_marks}</span>}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm font-semibold mb-3 theme-text">
          Question No. {current + 1}
        </p>

        <div className="mb-4">
          <div className="leading-relaxed whitespace-pre-wrap theme-text">
            <MathText>{question.question_text}</MathText>
          </div>
          {question.question_image_url && (
            <img
              src={question.question_image_url}
              alt="question"
              loading="eager"
              fetchpriority="high"
              decoding="async"
              className="mt-3 w-full max-w-2xl max-h-64 object-contain rounded cursor-pointer border bg-muted aspect-[21/9] theme-border"
              onClick={() => window.open(question.question_image_url, '_blank')}
            />
          )}
        </div>

        {question.question_type === 'mcq' && (
          <div className="space-y-2">
            {question.options.map((option, i) => {
              const letter = 'ABCD'[i]
              const selected = answers[question.id] === letter
              return (
                <div
                  key={i}
                  onClick={() => setMCQ(letter)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setMCQ(letter)
                    }
                  }}
                  className={clsx('q-option cursor-pointer', selected && 'selected', 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none')}
                >
                  <div className={clsx(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                    selected ? 'border-primary bg-primary' : 'border-muted-foreground'
                  )}>
                    {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-semibold mr-2 theme-muted">{letter}.</span>
                    <div className="text-sm theme-text"><MathText>{option}</MathText></div>
                    {question.option_images?.[letter] && (
                      <img
                        src={question.option_images[letter]}
                        alt={`option ${letter}`}
                        loading="lazy"
                        decoding="async"
                        className="mt-2 w-full max-w-sm max-h-32 object-contain rounded cursor-pointer bg-muted aspect-[21/9]"
                        onClick={event => {
                          event.stopPropagation()
                          window.open(question.option_images[letter], '_blank')
                        }}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {question.question_type === 'msq' && (
          <div className="space-y-2">
            <p className="text-xs text-warning-text mb-2">One or more correct answers. No negative marking.</p>
            {question.options.map((option, i) => {
              const letter = 'ABCD'[i]
              const selected = (answers[question.id] || '').split(',').includes(letter)
              return (
                <div
                  key={i}
                  onClick={() => toggleMSQ(letter)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      toggleMSQ(letter)
                    }
                  }}
                  className={clsx('q-option cursor-pointer', selected && 'selected-msq', 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none')}
                >
                  <div className={clsx(
                    'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                    selected ? 'border-[var(--accent-indigo)] bg-[var(--accent-indigo)]' : 'border-muted-foreground'
                  )}>
                    {selected && <span className="text-foreground text-xs font-bold">✓</span>}
                  </div>
                  <span className="text-xs font-semibold mr-2 theme-muted">{letter}.</span>
                  <div className="flex-1">
                    <div className="text-sm theme-text"><MathText>{option}</MathText></div>
                    {question.option_images?.[letter] && (
                      <img
                        src={question.option_images[letter]}
                        alt={`option ${letter}`}
                        loading="lazy"
                        decoding="async"
                        className="mt-2 w-full max-w-sm max-h-32 object-contain rounded cursor-pointer bg-muted aspect-[21/9]"
                        onClick={event => {
                          event.stopPropagation()
                          window.open(question.option_images[letter], '_blank')
                        }}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {question.question_type === 'nat' && (
          <div>
            <p className="text-xs text-success-text mb-3">Enter numerical answer. No negative marking.</p>
            <div className="flex gap-3 items-center max-w-xs">
              <input
                type="number"
                step="any"
                className="input font-mono text-lg flex-1"
                value={natInput}
                onChange={event => setNatInput(event.target.value)}
                onBlur={commitNAT}
                placeholder="Enter answer..."
                aria-label="Numerical Answer"
              />
              <Button onClick={commitNAT} className="px-4">Save</Button>
            </div>
            {answers[question.id] && (
              <p className="text-success-text text-sm mt-2">
                ✓ Saved: <span className="font-mono font-semibold">{answers[question.id]}</span>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-2.5 border-t flex-shrink-0 gap-1 theme-card-surface">
        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={markAndNext} className="theme-panel-button flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2.5 sm:py-2 rounded border text-xs font-medium">
            <Flag size={14} className="text-[var(--marked-text)]" /> <span className="hidden sm:inline">Mark & Next</span>
          </button>
          <button onClick={clearResponse} className="theme-panel-button px-2 sm:px-3 py-2.5 sm:py-2 rounded border text-xs font-medium">
            Clear
          </button>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => current > 0 && setCurrent(c => c - 1)}
            disabled={current === 0}
            className="theme-panel-button flex items-center gap-1 px-2 sm:px-3 py-2.5 sm:py-2 rounded border text-xs font-medium disabled:opacity-40"
          >
            <ChevronLeft size={13} /> <span className="hidden sm:inline">Prev</span>
          </button>
          <button onClick={saveAndNext} className="flex items-center gap-1 px-3 sm:px-4 py-2.5 sm:py-2 rounded text-xs font-semibold bg-primary hover:opacity-90 text-primary-foreground transition-colors">
            Save & Next <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
