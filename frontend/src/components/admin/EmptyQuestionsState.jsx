import FileJson from 'lucide-react/dist/esm/icons/file-json'
import Plus from 'lucide-react/dist/esm/icons/plus'

export default function EmptyQuestionsState({ onOpenJson, onOpenManual }) {
  return (
    <div className="gate-card p-10 text-center">
      <p className="theme-muted mb-3">No questions yet.</p>
      <div className="flex gap-3 justify-center">
        <button onClick={onOpenJson} className="btn-ghost flex items-center gap-2 text-sm">
          <FileJson size={14}/> Upload JSON
        </button>
        <button onClick={onOpenManual} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={14}/> Add Manually
        </button>
      </div>
    </div>
  )
}
