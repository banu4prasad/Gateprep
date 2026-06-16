import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left'
import Eye from 'lucide-react/dist/esm/icons/eye'
import FileJson from 'lucide-react/dist/esm/icons/file-json'
import Pencil from 'lucide-react/dist/esm/icons/pencil'
import Plus from 'lucide-react/dist/esm/icons/plus'
import Save from 'lucide-react/dist/esm/icons/save'
import X from 'lucide-react/dist/esm/icons/x'
import { adminAPI } from '../api/api'
import JSONUploadForm from '../components/admin/JSONUploadForm'
import QuestionCard from '../components/admin/QuestionCard'
import QuestionForm from '../components/admin/QuestionForm'
import Layout from '../components/shared/Layout'
import Spinner from '../components/shared/Spinner'

export default function AdminTestDetail() {
  const { testId } = useParams()
  const navigate = useNavigate()
  const [test, setTest] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState(null)
  const [isEditingTest, setIsEditingTest] = useState(false)
  const [testForm, setTestForm] = useState({ title: '', description: '', duration_minutes: 180 })
  const [savingTest, setSavingTest] = useState(false)

  const load = useCallback(async () => {
    try {
      const [testResponse, questionsResponse] = await Promise.all([
        adminAPI.getTest(testId),
        adminAPI.getQuestions(testId),
      ])

      setTest(testResponse.data)
      setTestForm({
        title: testResponse.data.title || '',
        description: testResponse.data.description || '',
        duration_minutes: testResponse.data.duration_minutes || 180,
      })
      setQuestions(questionsResponse.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load test')
    } finally {
      setLoading(false)
    }
  }, [testId])

  useEffect(() => {
    load()
  }, [load])

  const startEditingTest = useCallback(() => {
    setTestForm({
      title: test?.title || '',
      description: test?.description || '',
      duration_minutes: test?.duration_minutes || 180,
    })
    setIsEditingTest(true)
  }, [test])

  const saveTest = useCallback(async (event) => {
    event.preventDefault()
    if (!testForm.title.trim()) { toast.error('Title required'); return }

    const durationMinutes = Number(testForm.duration_minutes)
    if (!Number.isFinite(durationMinutes) || durationMinutes < 5 || durationMinutes > 360) {
      toast.error('Duration must be between 5 and 360 minutes')
      return
    }

    setSavingTest(true)
    try {
      const payload = {
        title: testForm.title.trim(),
        description: testForm.description.trim(),
        duration_minutes: durationMinutes,
      }
      await adminAPI.updateTest(testId, payload)
      setTest(current => ({ ...current, ...payload }))
      setIsEditingTest(false)
      toast.success('Test updated')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update test')
    } finally {
      setSavingTest(false)
    }
  }, [testForm, testId])

  const addQuestion = useCallback(async (question) => {
    await adminAPI.addQuestions(testId, [question])
    await load()
    setMode(null)
  }, [load, testId])

  const addQuestionsJSON = useCallback(async (questionsToAdd) => {
    const chunkSize = 20
    for (let idx = 0; idx < questionsToAdd.length; idx += chunkSize) {
      await adminAPI.addQuestions(testId, questionsToAdd.slice(idx, idx + chunkSize))
    }
    await load()
  }, [load, testId])

  const uploadQuestionsFile = useCallback(async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await adminAPI.uploadQuestionsFile(testId, formData)
    await load()
    return response.data
  }, [load, testId])

  const deleteQuestion = useCallback(async (questionId) => {
    if (!confirm('Delete this question?')) return

    try {
      await adminAPI.deleteQuestion(testId, questionId)
      setQuestions(current => current.filter(question => question.id !== questionId))
      toast.success('Deleted')
    } catch {
      toast.error('Failed')
    }
  }, [testId])

  const updateQuestion = useCallback(async (questionId, payload) => {
    await adminAPI.updateQuestion(testId, questionId, payload)
    await load()
  }, [load, testId])

  const uploadImage = useCallback(async (questionId, file, target = 'question') => {
    const formData = new FormData()
    formData.append('image', file)

    try {
      await adminAPI.uploadQImage(questionId, formData, target)
      toast.success(target === 'question' ? 'Question image uploaded!' : `Option ${target} image uploaded!`)
      await load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed. Check Cloudinary config.')
    }
  }, [load])

  const deleteImage = useCallback(async (questionId, target) => {
    try {
      await adminAPI.deleteQImage(questionId, target)
      toast.success('Image removed')
      await load()
    } catch {
      toast.error('Failed to remove image')
    }
  }, [load])

  const closeMode = useCallback(() => setMode(null), [])
  const openJsonMode = useCallback(() => setMode('json'), [])
  const openManualMode = useCallback(() => setMode('manual'), [])
  const toggleJsonMode = useCallback(() => setMode(current => (current === 'json' ? null : 'json')), [])
  const toggleManualMode = useCallback(() => setMode(current => (current === 'manual' ? null : 'manual')), [])
  const previewTest = useCallback(() => navigate(`/tests/${testId}?preview=true`), [navigate, testId])

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-16">
          <Spinner size={28} className="text-sky-500"/>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in max-w-3xl">
        <div>
          <Link to="/admin/tests" className="flex items-center gap-1.5 theme-muted hover:opacity-80 text-sm mb-4 w-fit">
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
                  <h1 className="text-2xl font-bold theme-text">{test?.title}</h1>
                  <button
                    onClick={startEditingTest}
                    aria-label="Edit test details"
                    className="p-1.5 rounded-lg theme-muted hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
                  >
                    <Pencil size={15}/>
                  </button>
                </div>
                <p className="theme-muted mt-1 text-sm">{test?.description || 'No description'}</p>
                <div className="flex items-center gap-4 mt-2 text-xs theme-muted">
                  <span>{test?.duration_minutes} min</span>
                  <span>{questions.length} questions</span>
                  <span>{test?.total_marks} marks</span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
              <button
                onClick={previewTest}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all btn-ghost"
              >
                <Eye size={15}/> Preview Test
              </button>
              <button
                onClick={toggleJsonMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${mode === 'json' ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'btn-ghost'}`}
              >
                <FileJson size={15}/> JSON
              </button>
              <button
                onClick={toggleManualMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${mode === 'manual' ? 'bg-sky-500/15 border-brand-500/30 text-sky-300' : 'btn-primary'}`}
              >
                <Plus size={15}/> Manual
              </button>
            </div>
          </div>
        </div>

        {mode === 'manual' && <QuestionForm onAdd={addQuestion} onClose={closeMode} />}
        {mode === 'json' && (
          <JSONUploadForm onAdd={addQuestionsJSON} onUploadFile={uploadQuestionsFile} onClose={closeMode} />
        )}

        <div className="space-y-2">
          {questions.length === 0 ? (
            <div className="gate-card p-10 text-center">
              <p className="theme-muted mb-3">No questions yet.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={openJsonMode} className="btn-ghost flex items-center gap-2 text-sm">
                  <FileJson size={14}/> Upload JSON
                </button>
                <button onClick={openManualMode} className="btn-primary flex items-center gap-2 text-sm">
                  <Plus size={14}/> Add Manually
                </button>
              </div>
            </div>
          ) : (
            questions.map((question, idx) => (
              <QuestionCard
                key={question.id}
                q={question}
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
