import { memo, useState } from 'react'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up'
import Pencil from 'lucide-react/dist/esm/icons/pencil'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import Upload from 'lucide-react/dist/esm/icons/upload'
import QuestionEditForm from './QuestionEditForm'
import { OPTION_LETTERS } from './questionUtils'

const typeColor = { mcq: 'badge-blue', msq: 'badge-amber', nat: 'badge-green' }

const openImage = (url) => {
  window.open(url, '_blank')
}

const imageKeyHandler = (url) => (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    openImage(url)
  }
}

const QuestionCard = memo(function QuestionCard({
  q,
  idx,
  onDelete,
  onUpdate,
  onUploadImage,
  onDeleteImage,
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const optionImages = q.option_images || {}

  const toggleOpen = () => setOpen(current => !current)
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleOpen()
    }
  }

  return (
    <div className="gate-card overflow-hidden" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 80px' }}>
      <div
        className="flex items-start gap-3 p-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-500 rounded outline-none"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onKeyDown={handleKeyDown}
        onClick={toggleOpen}
      >
        <span className="font-mono theme-muted text-sm mt-0.5 w-6 flex-shrink-0">Q{idx + 1}</span>
        <div className="flex-1 min-w-0">
          <p className="theme-text text-sm line-clamp-2">{q.question_text}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`badge text-xs ${typeColor[q.question_type]}`}>{q.question_type.toUpperCase()}</span>
            <span className="theme-muted text-xs">{q.marks}M</span>
            {q.subject && <span className="theme-muted text-xs">&middot; {q.subject}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={event => { event.stopPropagation(); setOpen(true); setEditing(true) }}
            aria-label="Edit question"
            className="p-1.5 rounded-lg theme-muted hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
          >
            <Pencil size={13}/>
          </button>
          <button
            onClick={event => { event.stopPropagation(); onDelete(q.id) }}
            aria-label="Delete question"
            className="p-1.5 rounded-lg theme-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={13}/>
          </button>
          {open ? <ChevronUp size={15} className="theme-muted"/> : <ChevronDown size={15} className="theme-muted"/>}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 border-t theme-border pt-3 space-y-3">
          {editing ? (
            <QuestionEditForm
              question={q}
              onSave={async (payload) => {
                await onUpdate(q.id, payload)
                setEditing(false)
              }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <>
              {q.options?.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                  {q.options.map((option, optionIdx) => {
                    const letter = OPTION_LETTERS[optionIdx] || String(optionIdx + 1)
                    const isCorrect = q.correct_answer?.includes(letter)
                    return (
                      <div
                        key={letter}
                        className={`px-3 py-2 rounded-lg text-xs space-y-2 border ${
                          isCorrect
                            ? 'bg-green-500/10 border-green-500/20 text-green-300'
                            : 'theme-panel-card'
                        }`}
                      >
                        <p>
                          <span className="font-mono font-semibold mr-1.5">{letter}.</span>{option}
                        </p>
                        {optionImages[letter] ? (
                          <div className="flex items-start gap-2">
                            <img
                              src={optionImages[letter]}
                              alt={`Option ${letter}`}
                              role="button"
                              tabIndex={0}
                              aria-label={`View option ${letter} image`}
                              loading="lazy"
                              decoding="async"
                              onKeyDown={imageKeyHandler(optionImages[letter])}
                              className="max-h-24 rounded border theme-border cursor-pointer theme-surface focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
                              onClick={() => openImage(optionImages[letter])}
                            />
                            <button onClick={() => onDeleteImage(q.id, letter)} className="text-xs text-red-400 hover:text-red-300 mt-1">
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 cursor-pointer w-fit">
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-dashed theme-border text-xs theme-muted hover:border-sky-500 hover:text-sky-400 transition-colors">
                              <Upload size={12}/> Add answer image
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={event => { if (event.target.files[0]) onUploadImage(q.id, event.target.files[0], letter) }}
                            />
                          </label>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs">
                <span className="theme-muted">Answer:</span>
                <span className="font-mono text-green-400 font-semibold">{q.correct_answer}</span>
                <span className="theme-muted ml-2">&middot;</span>
                <span className="theme-muted">+{q.marks}M</span>
                {q.negative_marks > 0 && <span className="theme-muted">/ -{q.negative_marks}M</span>}
              </div>

              <div className="border-t theme-border pt-3">
                <p className="text-xs theme-muted mb-2">Question Image (optional)</p>
                {q.question_image_url ? (
                  <div className="flex items-start gap-3">
                    <img
                      src={q.question_image_url}
                      alt="Question image"
                      role="button"
                      tabIndex={0}
                      aria-label="View full size image"
                      loading="lazy"
                      decoding="async"
                      onKeyDown={imageKeyHandler(q.question_image_url)}
                      className="max-h-32 rounded border theme-border cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
                      onClick={() => openImage(q.question_image_url)}
                    />
                    <button onClick={() => onDeleteImage(q.id, 'question')} className="text-xs text-red-400 hover:text-red-300 mt-1">
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-dashed theme-border text-xs theme-muted hover:border-sky-500 hover:text-sky-400 transition-colors">
                      <Upload size={13}/> Upload Image
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={event => { if (event.target.files[0]) onUploadImage(q.id, event.target.files[0], 'question') }}
                    />
                  </label>
                )}
                <div className="mt-3">
                  <button onClick={() => setEditing(true)} className="btn-ghost inline-flex items-center gap-2 text-sm">
                    <Pencil size={13}/> Edit Question
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
})

export default QuestionCard
