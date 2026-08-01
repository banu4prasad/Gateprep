import MathText from '../shared/MathText'

const TYPE_LABELS = {
  mcq: 'MCQ Single',
  msq: 'MSQ Multiple',
  nat: 'NAT Numerical',
}

export default function QuestionMetaBar({ question }) {
  const typeLabel = TYPE_LABELS[question.question_type] ?? question.question_type

  return (
    <div className="px-3 sm:px-4 py-1.5 text-xs border-b flex items-center flex-wrap gap-2 sm:gap-4 flex-shrink-0 theme-card-surface">
      <span className="theme-muted">
        Question Type: <strong className="theme-text">{typeLabel}</strong>
      </span>
      <span className="theme-muted">
        Marks: <strong className="text-success-text">+{question.marks}</strong>
        {question.negative_marks > 0 && (
          <span className="text-destructive ml-1">/ -{question.negative_marks}</span>
        )}
      </span>
    </div>
  )
}
