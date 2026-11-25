import { BookOpen, Clock, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TestMetaRowProps {
  durationMinutes: number
  questionCount: number
  totalMarks: number
  className?: string
}

/** Displays standardized test metadata across dashboard and test catalog cards. */
export default function TestMetaRow({
  durationMinutes,
  questionCount,
  totalMarks,
  className,
}: TestMetaRowProps): React.ReactElement {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground transition-colors duration-200',
        className
      )}
    >
      <span className="inline-flex items-center gap-1">
        <Clock size={12} aria-hidden="true" />
        {durationMinutes} min
      </span>
      <span aria-hidden="true">•</span>
      <span className="inline-flex items-center gap-1">
        <BookOpen size={12} aria-hidden="true" />
        {questionCount} {questionCount === 1 ? 'question' : 'questions'}
      </span>
      <span aria-hidden="true">•</span>
      <span className="inline-flex items-center gap-1">
        <Target size={12} aria-hidden="true" />
        {totalMarks} {totalMarks === 1 ? 'mark' : 'marks'}
      </span>
    </div>
  )
}
