import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import Spinner from '../shared/Spinner'

export default function ConfirmSubmitModal({
  answered,
  doSubmit,
  marked,
  notAnswered,
  questions,
  setShowConfirm,
  submitting,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 theme-modal-backdrop">
      <div
        className="w-full max-w-sm p-6 rounded-xl animate-slide-up theme-card-surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-submit-title"
      >
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={22} className="text-warning-text" />
          <h3 id="confirm-submit-title" className="font-bold text-lg theme-text">Submit Test?</h3>
        </div>
        <div className="space-y-1.5 mb-5 text-sm">
          {[
            ['Total Questions', questions.length, 'theme-text'],
            ['Answered', answered, 'text-[var(--success-text)]'],
            ['Not Answered', notAnswered, 'text-[var(--danger-text)]'],
            ['Marked', marked.size, 'text-[var(--marked-text)]'],
          ].map(([label, val, colorClass]) => (
            <div key={label} className="flex justify-between py-1.5 border-b theme-border">
              <span className="theme-muted">{label}</span>
              <span className={`font-semibold ${colorClass}`}>{val}</span>
            </div>
          ))}
        </div>
        <p className="text-xs mb-5 theme-muted">
          This cannot be undone. Your answers will be evaluated.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setShowConfirm(false)} className="btn-ghost flex-1">Go Back</button>
          <button
            onClick={() => {
              setShowConfirm(false)
              doSubmit(false)
            }}
            disabled={submitting}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {submitting && <Spinner size={13} />} Submit
          </button>
        </div>
      </div>
    </div>
  )
}
