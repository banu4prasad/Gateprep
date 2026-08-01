import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right'
import Flag from 'lucide-react/dist/esm/icons/flag'

export default function QuestionFooter({ current, setCurrent, markAndNext, clearResponse, saveAndNext }) {
  return (
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
  )
}
