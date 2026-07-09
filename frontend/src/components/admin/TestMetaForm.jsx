import Spinner from '../shared/Spinner'
import Save from 'lucide-react/dist/esm/icons/save'
import X from 'lucide-react/dist/esm/icons/x'

export default function TestMetaForm({ testForm, setTestForm, onSave, onCancel, savingTest }) {
  return (
    <form onSubmit={onSave} className="gate-card p-4 space-y-3 flex-1">
      <div>
        <label className="label">Test Title *</label>
        <input
          className="input"
          value={testForm.title}
          onChange={event => setTestForm(form => ({ ...form, title: event.target.value }))}
          required
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input resize-none"
          rows={2}
          value={testForm.description}
          onChange={event => setTestForm(form => ({ ...form, description: event.target.value }))}
        />
      </div>
      <div>
        <label className="label">Duration (minutes)</label>
        <input
          type="number"
          min={5}
          max={360}
          className="input"
          value={testForm.duration_minutes}
          onChange={event => setTestForm(form => ({ ...form, duration_minutes: event.target.value }))}
        />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="btn-ghost flex items-center justify-center gap-2 text-sm">
          <X size={14}/> Cancel
        </button>
        <button type="submit" disabled={savingTest} className="btn-primary flex items-center justify-center gap-2 text-sm">
          {savingTest ? <Spinner size={14}/> : <Save size={14}/>}
          {savingTest ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}
