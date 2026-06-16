import Send from 'lucide-react/dist/esm/icons/send'
import Spinner from '../shared/Spinner'
import { getQStatus, STATUS_CLASS } from '../../utils/testEngineUtils'

export default function TestSidebar({
  answered,
  answers,
  currentQuestion,
  marked,
  notAnswered,
  onQuestionSelect,
  onSubmitClick,
  questions,
  submitting,
  subjects,
  visited,
}) {
  return (
    <>
      <div className="p-3 border-b text-center theme-border">
        <div className="w-9 h-9 rounded-full bg-sky-700 flex items-center justify-center mx-auto mb-1">
          <span className="text-slate-900 dark:text-white font-bold text-sm">U</span>
        </div>
      </div>

      <div className="p-2 border-b space-y-1.5 theme-border">
        {[
          ['q-dot-answered', `Answered (${answered})`],
          ['q-dot-not-answered', `Not Answered (${notAnswered})`],
          ['q-dot-not-visited', `Not Visited (${questions.length - visited.size})`],
          ['q-dot-marked', `Marked (${marked.size})`],
        ].map(([cls, label]) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`q-dot w-6 h-6 text-[9px] ${cls}`} />
            <span className="text-xs theme-muted">{label}</span>
          </div>
        ))}
      </div>

      {subjects.map(subject => {
        const subjectQuestions = questions.filter(q => (q.subject || 'General') === subject)
        return (
          <div key={subject} className="p-2 border-b theme-border">
            <p className="text-xs font-semibold mb-2 truncate theme-text">{subject}</p>
            <div className="grid grid-cols-5 gap-1">
              {subjectQuestions.map(question => {
                const questionIndex = questions.indexOf(question)
                const isCurrent = question.id === currentQuestion?.id
                const status = isCurrent
                  ? 'current'
                  : !visited.has(question.id)
                    ? 'not-visited'
                    : getQStatus(question.id, currentQuestion?.id, answers, marked)
                return (
                  <button
                    key={question.id}
                    onClick={() => onQuestionSelect(questionIndex)}
                    className={STATUS_CLASS[status] || STATUS_CLASS['not-visited']}
                  >
                    {questionIndex + 1}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="p-2 mt-auto">
        <button
          onClick={onSubmitClick}
          disabled={submitting}
          className="btn-primary w-full flex items-center justify-center gap-1.5 text-xs py-2"
        >
          {submitting ? <Spinner size={12} /> : <Send size={12} />} Submit Test
        </button>
      </div>
    </>
  )
}
