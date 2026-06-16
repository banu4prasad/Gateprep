import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import { adminAPI } from '../api/api'
import toast from 'react-hot-toast'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left'
import Plus from 'lucide-react/dist/esm/icons/plus'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up'
import X from 'lucide-react/dist/esm/icons/x'
import Upload from 'lucide-react/dist/esm/icons/upload'
import FileJson from 'lucide-react/dist/esm/icons/file-json'
import Eye from 'lucide-react/dist/esm/icons/eye'
import Pencil from 'lucide-react/dist/esm/icons/pencil'
import Save from 'lucide-react/dist/esm/icons/save'
import Spinner from '../components/shared/Spinner'

const EMPTY_Q = { question_type: 'mcq', question_text: '', options: ['','','',''], correct_answer: 'A', marks: 1, negative_marks: 0.33, subject: '', topic: '' }
const OPTION_LETTERS = ['A', 'B', 'C', 'D']

const optionsFromQuestion = (options) =>
  OPTION_LETTERS.map((_, idx) => Array.isArray(options) ? options[idx] || '' : '')

function QuestionForm({ onAdd, onClose }) {
  const [q, setQ] = useState({ ...EMPTY_Q, options: ['','','',''] })
  const [loading, setLoading] = useState(false)
  const isNAT = q.question_type === 'nat'
  const isMSQ = q.question_type === 'msq'

  const setOpt = (i, v) => setQ(prev => { const o=[...prev.options]; o[i]=v; return {...prev, options:o} })

  const submit = async () => {
    if (!q.question_text.trim()) { toast.error('Question text required'); return }
    if (!isNAT && q.options.some(o => !o.trim())) { toast.error('Fill all 4 options'); return }
    if (!q.correct_answer.trim()) { toast.error('Correct answer required'); return }
    setLoading(true)
    try {
      const payload = { ...q, options: isNAT ? [] : q.options, negative_marks: (isMSQ||isNAT) ? 0 : q.negative_marks }
      await onAdd(payload)
      setQ({ ...EMPTY_Q, options: ['','','',''] })
      toast.success('Question added')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="gate-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-900 dark:text-white">Add Question Manually</h4>
        <button onClick={onClose} aria-label="Close" className="text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:text-slate-300"><X size={16}/></button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Type</label>
          <select className="input" value={q.question_type} onChange={e => setQ(prev=>({...prev, question_type:e.target.value, correct_answer:'', negative_marks: e.target.value==='mcq'?0.33:0}))}>
            <option value="mcq">MCQ (Single)</option>
            <option value="msq">MSQ (Multi)</option>
            <option value="nat">NAT (Numerical)</option>
          </select>
        </div>
        <div>
          <label className="label">Marks</label>
          <input type="number" className="input" value={q.marks} step={0.5} min={0.5} onChange={e=>setQ(p=>({...p,marks:+e.target.value}))} />
        </div>
        <div>
          <label className="label">Neg. Marks</label>
          <input type="number" className="input" value={q.negative_marks} step={0.01} min={0} disabled={isMSQ||isNAT} onChange={e=>setQ(p=>({...p,negative_marks:+e.target.value}))} />
        </div>
      </div>
      <div>
        <label className="label">Question Text *</label>
        <textarea className="input resize-none" rows={3} value={q.question_text} onChange={e=>setQ(p=>({...p,question_text:e.target.value}))} placeholder="Enter question..." />
      </div>
      {!isNAT && (
        <div className="grid grid-cols-2 gap-2">
          {['A','B','C','D'].map((l,i) => (
            <div key={l}>
              <label className="label">Option {l}</label>
              <input className="input" value={q.options[i]} onChange={e=>setOpt(i,e.target.value)} placeholder={`Option ${l}`} />
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{isNAT ? 'Answer (e.g. 42 or 41.5-42.5)' : isMSQ ? 'Correct (e.g. A,C)' : 'Correct (A/B/C/D)'}</label>
          <input className="input font-mono" value={q.correct_answer} onChange={e=>setQ(p=>({...p,correct_answer:e.target.value.toUpperCase()}))} placeholder={isNAT?'42 or 41.5-42.5':isMSQ?'A,C':'A'} />
        </div>
        <div>
          <label className="label">Subject (optional)</label>
          <input className="input" value={q.subject} onChange={e=>setQ(p=>({...p,subject:e.target.value}))} placeholder="e.g. Digital Logic" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
        <button onClick={submit} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {loading && <Spinner size={14}/>} Add Question
        </button>
      </div>
    </div>
  )
}

function QuestionEditForm({ question, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({
    question_type: question.question_type || 'mcq',
    question_text: question.question_text || '',
    options: optionsFromQuestion(question.options),
    correct_answer: question.correct_answer || '',
    marks: question.marks ?? 1,
    negative_marks: question.negative_marks ?? 0.33,
    subject: question.subject || '',
    topic: question.topic || '',
  }))
  const [saving, setSaving] = useState(false)
  const isNAT = form.question_type === 'nat'
  const isMSQ = form.question_type === 'msq'

  const setOption = (idx, value) => {
    setForm(prev => ({
      ...prev,
      options: prev.options.map((option, optionIdx) => optionIdx === idx ? value : option),
    }))
  }

  const setType = (questionType) => {
    setForm(prev => ({
      ...prev,
      question_type: questionType,
      correct_answer: '',
      negative_marks: questionType === 'mcq' ? 0.33 : 0,
    }))
  }

  const submit = async (event) => {
    event.preventDefault()
    const marks = Number(form.marks)
    const negativeMarks = Number(form.negative_marks)

    if (!form.question_text.trim()) { toast.error('Question text required'); return }
    if (!isNAT && form.options.some(option => !option.trim())) { toast.error('Fill all 4 options'); return }
    if (!form.correct_answer.trim()) { toast.error('Correct answer required'); return }
    if (!Number.isFinite(marks) || marks <= 0) { toast.error('Marks must be greater than 0'); return }
    if (!Number.isFinite(negativeMarks) || negativeMarks < 0) { toast.error('Negative marks cannot be below 0'); return }

    const payload = {
      ...form,
      question_text: form.question_text.trim(),
      options: isNAT ? [] : form.options.map(option => option.trim()),
      correct_answer: form.correct_answer.trim().toUpperCase(),
      marks,
      negative_marks: (isMSQ || isNAT) ? 0 : negativeMarks,
      subject: form.subject.trim() || null,
      topic: form.topic.trim() || null,
    }

    setSaving(true)
    try {
      await onSave(payload)
      toast.success('Question updated')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update question')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.question_type} onChange={e => setType(e.target.value)}>
            <option value="mcq">MCQ (Single)</option>
            <option value="msq">MSQ (Multi)</option>
            <option value="nat">NAT (Numerical)</option>
          </select>
        </div>
        <div>
          <label className="label">Marks</label>
          <input type="number" className="input" value={form.marks} step={0.5} min={0.5} onChange={e => setForm(prev => ({ ...prev, marks: e.target.value }))} />
        </div>
        <div>
          <label className="label">Neg. Marks</label>
          <input type="number" className="input" value={form.negative_marks} step={0.01} min={0} disabled={isMSQ || isNAT} onChange={e => setForm(prev => ({ ...prev, negative_marks: e.target.value }))} />
        </div>
      </div>

      <div>
        <label className="label">Question Text *</label>
        <textarea className="input resize-none" rows={4} value={form.question_text} onChange={e => setForm(prev => ({ ...prev, question_text: e.target.value }))} />
      </div>

      {!isNAT && (
        <div className="grid grid-cols-2 gap-2">
          {OPTION_LETTERS.map((letter, idx) => (
            <div key={letter}>
              <label className="label">Option {letter}</label>
              <input className="input" value={form.options[idx]} onChange={e => setOption(idx, e.target.value)} />
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="label">{isNAT ? 'Answer' : isMSQ ? 'Correct (e.g. A,C)' : 'Correct (A/B/C/D)'}</label>
          <input className="input font-mono" value={form.correct_answer} onChange={e => setForm(prev => ({ ...prev, correct_answer: e.target.value.toUpperCase() }))} />
        </div>
        <div>
          <label className="label">Subject</label>
          <input className="input" value={form.subject} onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))} />
        </div>
        <div>
          <label className="label">Topic</label>
          <input className="input" value={form.topic} onChange={e => setForm(prev => ({ ...prev, topic: e.target.value }))} />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="btn-ghost flex items-center justify-center gap-2 text-sm">
          <X size={14}/> Cancel
        </button>
        <button type="submit" disabled={saving} className="btn-primary flex items-center justify-center gap-2 text-sm">
          {saving ? <Spinner size={14}/> : <Save size={14}/>}
          {saving ? 'Saving...' : 'Save Question'}
        </button>
      </div>
    </form>
  )
}

function JSONUploadForm({ onAdd, onUploadFile, onClose }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileMessage, setFileMessage] = useState('')
  const [fileError, setFileError] = useState('')
  const fileRef = useRef()
  const uploadFileRef = useRef()

  const SAMPLE = JSON.stringify({
    questions: [
      {
        question_type: "mcq",
        question_text: "What is the time complexity of binary search?",
        options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
        correct_answer: "B",
        marks: 1,
        negative_marks: 0.33,
        subject: "Algorithms"
      },
      {
        question_type: "nat",
        question_text: "How many distinct binary trees can be formed with 3 nodes?",
        options: [],
        correct_answer: "5",
        marks: 2,
        negative_marks: 0,
        subject: "Data Structures"
      }
    ]
  }, null, 2)

  const extractQuestions = (parsed) => {
    if (Array.isArray(parsed)) return parsed
    if (parsed?.questions && Array.isArray(parsed.questions)) return parsed.questions
    throw new Error('JSON root must be an array or an object with a "questions" array')
  }

  const validate = (val) => {
    setError('')
    setPreview(null)
    if (!val.trim()) return
    try {
      const parsed = JSON.parse(val)
      setPreview(extractQuestions(parsed))
    } catch (e) {
      setError(e instanceof SyntaxError ? 'Invalid JSON: ' + e.message : e.message)
    }
  }

  const handleChange = (val) => {
    setText(val)
    validate(val)
  }

  const loadFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target.result
      setText(content)
      validate(content)
    }
    reader.readAsText(file)
  }

  const loadSample = () => {
    setText(SAMPLE)
    validate(SAMPLE)
  }

  const formatServerDetail = (detail) => {
    if (!detail) return 'Failed to upload questions file'
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail.map(item => item?.msg || item?.message || String(item)).join('; ')
    }
    if (Array.isArray(detail.errors)) {
      const lines = detail.errors.slice(0, 5).map(err => {
        const q = err.question_index ? `Q${err.question_index}` : 'Question'
        const field = err.field ? ` ${err.field}` : ''
        return `${q}${field}: ${err.message}`
      })
      if (detail.errors.length > 5) lines.push(`...and ${detail.errors.length - 5} more`)
      return [detail.message, ...lines].filter(Boolean).join(' · ')
    }
    return detail.message || JSON.stringify(detail)
  }

  const handleUploadFileChange = (e) => {
    const file = e.target.files[0] || null
    setSelectedFile(file)
    setFileMessage('')
    setFileError('')
  }

  const submitFile = async () => {
    if (!selectedFile) { toast.error('Select a JSON file first'); return }
    if (!selectedFile.name.toLowerCase().endsWith('.json')) { toast.error('Only .json files are accepted'); return }
    setFileLoading(true)
    setFileMessage('')
    setFileError('')
    try {
      const result = await onUploadFile(selectedFile)
      const message = result?.message || `Imported ${result?.imported_count || 0} questions from JSON file`
      setFileMessage(message)
      setSelectedFile(null)
      if (uploadFileRef.current) uploadFileRef.current.value = ''
      toast.success(message)
    } catch (err) {
      const message = formatServerDetail(err.response?.data?.detail)
      setFileError(message)
      toast.error(message)
    } finally { setFileLoading(false) }
  }

  const submit = async () => {
    if (!preview || preview.length === 0) { toast.error('No valid questions to upload'); return }
    setLoading(true)
    setError('')
    try {
      await onAdd(preview)
      toast.success(`${preview.length} questions added!`)
      onClose()
    } catch (err) {
      const message = formatServerDetail(err.response?.data?.detail) || 'Failed to add questions'
      setError(message)
      toast.error(message)
    } finally { setLoading(false) }
  }

  return (
    <div className="gate-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-900 dark:text-white">Upload Questions via JSON</h4>
        <button onClick={onClose} aria-label="Close" className="text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:text-slate-300"><X size={16}/></button>
      </div>

      {/* Direct file upload */}
      <div className="px-3 py-3 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-200 dark:border-slate-700/60 space-y-3">
        <div>
          <label className="label">Upload JSON file directly</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              ref={uploadFileRef}
              type="file"
              accept=".json,application/json"
              onChange={handleUploadFileChange}
              className="input text-sm flex-1"
            />
            <button
              onClick={submitFile}
              disabled={fileLoading || !selectedFile}
              className="btn-primary flex items-center justify-center gap-2 text-sm py-2 sm:w-64"
            >
              {fileLoading ? <Spinner size={14}/> : <Upload size={14}/>}
              {fileLoading ? 'Uploading...' : 'Upload Questions File (.json)'}
            </button>
          </div>
        </div>
        {fileMessage && (
          <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            {fileMessage}
          </div>
        )}
        {fileError && (
          <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {fileError}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={() => fileRef.current?.click()} className="btn-ghost flex items-center gap-2 text-sm py-2">
          <Upload size={14}/> Load File into Editor
        </button>
        <button onClick={loadSample} className="btn-ghost flex items-center gap-2 text-sm py-2">
          <FileJson size={14}/> Load Sample
        </button>
        <input type="file" accept=".json" ref={fileRef} className="hidden" onChange={loadFile} />
      </div>

      {/* JSON format hint */}
      <div className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-200 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400">
        Format: <span className="text-slate-500 dark:text-slate-400 font-mono">{"{ \"questions\": [ { question_type, question_text, options, correct_answer, marks, negative_marks } ] }"}</span>
        <br/>
        question_type: <span className="text-sky-400">mcq</span> / <span className="text-amber-400">msq</span> / <span className="text-green-400">nat</span> &nbsp;·&nbsp;
        correct_answer: <span className="text-sky-400">A</span> or <span className="text-amber-400">A,C</span> or <span className="text-green-400">42</span>
      </div>

      {/* Text area */}
      <div>
        <label className="label">Paste JSON here</label>
        <textarea
          className="input resize-none font-mono text-xs"
          rows={10}
          value={text}
          onChange={e => handleChange(e.target.value)}
          placeholder={'{\n  "questions": [\n    {\n      "question_type": "mcq",\n      "question_text": "Your question here?",\n      "options": ["A text", "B text", "C text", "D text"],\n      "correct_answer": "B",\n      "marks": 1,\n      "negative_marks": 0.33\n    }\n  ]\n}'}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Preview */}
      {preview && !error && (
        <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          ✓ Valid JSON — {preview.length} question{preview.length !== 1 ? 's' : ''} ready to upload
          <div className="mt-1 space-y-0.5">
            {preview.slice(0, 3).map((q, i) => (
              <p key={i} className="text-green-400/70 text-xs truncate">
                {i+1}. [{q.question_type?.toUpperCase()}] {q.question_text}
              </p>
            ))}
            {preview.length > 3 && <p className="text-green-400/50 text-xs">...and {preview.length - 3} more</p>}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
        <button
          onClick={submit}
          disabled={loading || !preview || !!error}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {loading && <Spinner size={14}/>}
          {loading ? 'Uploading...' : `Upload ${preview ? preview.length : 0} Questions`}
        </button>
      </div>
    </div>
  )
}

function QuestionCard({ q, idx, onDelete, onUpdate, onUploadImage, onDeleteImage }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const typeColor = { mcq:'badge-blue', msq:'badge-amber', nat:'badge-green' }
  const optionImages = q.option_images || {}

  return (
    <div className="gate-card overflow-hidden" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 80px' }}>
      <div className="flex items-start gap-3 p-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-500 rounded outline-none" role="button" tabIndex={0} aria-expanded={open} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o=>!o); } }} onClick={() => setOpen(o=>!o)}>
        <span className="font-mono text-slate-600 text-sm mt-0.5 w-6 flex-shrink-0">Q{idx+1}</span>
        <div className="flex-1 min-w-0">
          <p className="text-slate-700 dark:text-slate-200 text-sm line-clamp-2">{q.question_text}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`badge text-xs ${typeColor[q.question_type]}`}>{q.question_type.toUpperCase()}</span>
            <span className="text-slate-600 text-xs">{q.marks}M</span>
            {q.subject && <span className="text-slate-600 text-xs">· {q.subject}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={e=>{e.stopPropagation(); setOpen(true); setEditing(true)}} aria-label="Edit question" className="p-1.5 rounded-lg text-slate-600 hover:text-sky-400 hover:bg-sky-500/10 transition-colors">
            <Pencil size={13}/>
          </button>
          <button onClick={e=>{e.stopPropagation();onDelete(q.id)}} aria-label="Delete question" className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 size={13}/>
          </button>
          {open ? <ChevronUp size={15} className="text-slate-500 dark:text-slate-400"/> : <ChevronDown size={15} className="text-slate-500 dark:text-slate-400"/>}
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-800 pt-3 space-y-3">
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
                  {q.options.map((o,i) => {
                    const letter = OPTION_LETTERS[i]
                    const isCorrect = q.correct_answer?.includes(letter)
                    return (
                      <div key={letter} className={`px-3 py-2 rounded-lg text-xs space-y-2 ${isCorrect ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400'}`}>
                        <p>
                          <span className="font-mono font-semibold mr-1.5">{letter}.</span>{o}
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
                              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.open(optionImages[letter], '_blank') } }}
                              className="max-h-24 rounded border border-slate-300 dark:border-slate-700 cursor-pointer bg-white dark:bg-slate-900 focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
                              onClick={() => window.open(optionImages[letter], '_blank')}
                            />
                            <button onClick={() => onDeleteImage(q.id, letter)} className="text-xs text-red-400 hover:text-red-300 mt-1">Remove</button>
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 cursor-pointer w-fit">
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-dashed border-slate-300 dark:border-slate-600 text-xs text-slate-500 dark:text-slate-400 hover:border-sky-500 hover:text-sky-400 transition-colors">
                              <Upload size={12}/> Add answer image
                            </div>
                            <input type="file" accept="image/*" className="hidden" onChange={e => { if(e.target.files[0]) onUploadImage(q.id, e.target.files[0], letter) }} />
                          </label>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Answer:</span>
                <span className="font-mono text-green-400 font-semibold">{q.correct_answer}</span>
                <span className="text-slate-600 ml-2">·</span>
                <span className="text-slate-500 dark:text-slate-400">+{q.marks}M</span>
                {q.negative_marks > 0 && <span className="text-slate-500 dark:text-slate-400">/ -{q.negative_marks}M</span>}
              </div>

              {/* Image upload section */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Question Image (optional)</p>
                {q.question_image_url ? (
                  <div className="flex items-start gap-3">
                    <img src={q.question_image_url} alt="Question image" role="button" tabIndex={0} aria-label="View full size image" loading="lazy" decoding="async" onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.open(q.question_image_url, '_blank'); } }} className="max-h-32 rounded border border-slate-300 dark:border-slate-700 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-500 outline-none" onClick={() => window.open(q.question_image_url, '_blank')} />
                    <button onClick={() => onDeleteImage(q.id, 'question')} className="text-xs text-red-400 hover:text-red-300 mt-1">Remove</button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-dashed border-slate-300 dark:border-slate-600 text-xs text-slate-500 dark:text-slate-400 hover:border-sky-500 hover:text-sky-400 transition-colors">
                      <Upload size={13}/> Upload Image
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={e => { if(e.target.files[0]) onUploadImage(q.id, e.target.files[0], 'question') }} />
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
}

export default function AdminTestDetail() {
  const { testId } = useParams()
  const navigate = useNavigate()
  const [test, setTest] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState(null) // 'manual' | 'json' | null
  const [isEditingTest, setIsEditingTest] = useState(false)
  const [testForm, setTestForm] = useState({ title: '', description: '', duration_minutes: 180 })
  const [savingTest, setSavingTest] = useState(false)

  const load = () => {
    Promise.all([adminAPI.getTest(testId), adminAPI.getQuestions(testId)])
      .then(([t, q]) => {
        setTest(t.data)
        setTestForm({
          title: t.data.title || '',
          description: t.data.description || '',
          duration_minutes: t.data.duration_minutes || 180,
        })
        setQuestions(q.data)
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [testId])

  const startEditingTest = () => {
    setTestForm({
      title: test?.title || '',
      description: test?.description || '',
      duration_minutes: test?.duration_minutes || 180,
    })
    setIsEditingTest(true)
  }

  const saveTest = async (e) => {
    e.preventDefault()
    if (!testForm.title.trim()) { toast.error('Title required'); return }
    const durationMinutes = Number(testForm.duration_minutes)
    if (!Number.isFinite(durationMinutes) || durationMinutes < 5 || durationMinutes > 360) {
      toast.error('Duration must be between 5 and 360 minutes')
      return
    }

    setSavingTest(true)
    try {
      await adminAPI.updateTest(testId, {
        title: testForm.title.trim(),
        description: testForm.description.trim(),
        duration_minutes: durationMinutes,
      })
      setTest(t => ({
        ...t,
        title: testForm.title.trim(),
        description: testForm.description.trim(),
        duration_minutes: durationMinutes,
      }))
      setIsEditingTest(false)
      toast.success('Test updated')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update test')
    } finally { setSavingTest(false) }
  }

  const addQuestion = async (q) => {
    await adminAPI.addQuestions(testId, [q])
    load()
    setMode(null)
  }

  const addQuestionsJSON = async (qs) => {
    const CHUNK = 20
    for (let i = 0; i < qs.length; i += CHUNK) {
      await adminAPI.addQuestions(testId, qs.slice(i, i + CHUNK))
    }
    load()
  }

  const uploadQuestionsFile = async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await adminAPI.uploadQuestionsFile(testId, fd)
    load()
    return res.data
  }

  const deleteQuestion = async (qId) => {
    if (!confirm('Delete this question?')) return
    try {
      await adminAPI.deleteQuestion(testId, qId)
      setQuestions(qs => qs.filter(q => q.id !== qId))
      toast.success('Deleted')
    } catch { toast.error('Failed') }
  }

  const updateQuestion = async (qId, payload) => {
    await adminAPI.updateQuestion(testId, qId, payload)
    load()
  }

  const uploadImage = async (qId, file, target = 'question') => {
    const fd = new FormData()
    fd.append('image', file)
    try {
      await adminAPI.uploadQImage(qId, fd, target)
      toast.success(target === 'question' ? 'Question image uploaded!' : `Option ${target} image uploaded!`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed. Check Cloudinary config.')
    }
  }

  const deleteImage = async (qId, target) => {
    try {
      await adminAPI.deleteQImage(qId, target)
      toast.success('Image removed')
      load()
    } catch { toast.error('Failed to remove image') }
  }

  if (loading) return <Layout><div className="flex justify-center py-16"><Spinner size={28} className="text-sky-500"/></div></Layout>

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in max-w-3xl">
        <div>
          <Link to="/admin/tests" className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:text-slate-300 text-sm mb-4 w-fit">
            <ArrowLeft size={15}/> Back to Tests
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            {isEditingTest ? (
              <form onSubmit={saveTest} className="gate-card p-4 space-y-3 flex-1">
                <div>
                  <label className="label">Test Title *</label>
                  <input
                    className="input"
                    value={testForm.title}
                    onChange={e => setTestForm(f => ({ ...f, title: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    className="input resize-none"
                    rows={2}
                    value={testForm.description}
                    onChange={e => setTestForm(f => ({ ...f, description: e.target.value }))}
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
                    onChange={e => setTestForm(f => ({ ...f, duration_minutes: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsEditingTest(false)} className="btn-ghost flex items-center justify-center gap-2 text-sm">
                    <X size={14}/> Cancel
                  </button>
                  <button type="submit" disabled={savingTest} className="btn-primary flex items-center justify-center gap-2 text-sm">
                    {savingTest ? <Spinner size={14}/> : <Save size={14}/>}
                    {savingTest ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="flex items-start gap-2">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{test?.title}</h1>
                  <button
                    onClick={startEditingTest}
                    aria-label="Edit test details"
                    className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
                  >
                    <Pencil size={15}/>
                  </button>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{test?.description || 'No description'}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{test?.duration_minutes} min</span>
                  <span>{questions.length} questions</span>
                  <span>{test?.total_marks} marks</span>
                </div>
              </div>
            )}
            {/* Add buttons */}
            <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
              <button
                onClick={() => navigate(`/tests/${testId}?preview=true`)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all btn-ghost`}
              >
                <Eye size={15}/> Preview Test
              </button>
              <button
                onClick={() => setMode(mode === 'json' ? null : 'json')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${mode==='json' ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'btn-ghost'}`}
              >
                <FileJson size={15}/> JSON
              </button>
              <button
                onClick={() => setMode(mode === 'manual' ? null : 'manual')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${mode==='manual' ? 'bg-sky-500/15 border-brand-500/30 text-sky-300' : 'btn-primary'}`}
              >
                <Plus size={15}/> Manual
              </button>
            </div>
          </div>
        </div>

        {mode === 'manual' && <QuestionForm onAdd={addQuestion} onClose={() => setMode(null)} />}
        {mode === 'json' && <JSONUploadForm onAdd={addQuestionsJSON} onUploadFile={uploadQuestionsFile} onClose={() => setMode(null)} />}

        <div className="space-y-2">
          {questions.length === 0 ? (
            <div className="gate-card p-10 text-center">
              <p className="text-slate-500 dark:text-slate-400 mb-3">No questions yet.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setMode('json')} className="btn-ghost flex items-center gap-2 text-sm">
                  <FileJson size={14}/> Upload JSON
                </button>
                <button onClick={() => setMode('manual')} className="btn-primary flex items-center gap-2 text-sm">
                  <Plus size={14}/> Add Manually
                </button>
              </div>
            </div>
          ) : (
            questions.map((q, idx) => (
              <QuestionCard
                key={q.id}
                q={q}
                idx={idx}
                onDelete={deleteQuestion}
                onUpdate={updateQuestion}
                onUploadImage={uploadImage}
                onDeleteImage={deleteImage}
              />
            ))
          )}
        </div>
      </div>
    </Layout>
  )
}
