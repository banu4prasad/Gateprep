import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left'
import { useAdminTest } from '../hooks/useAdminTest'
import JSONUploadForm from '../components/admin/JSONUploadForm'
import QuestionCard from '../components/admin/QuestionCard'
import QuestionForm from '../components/admin/QuestionForm'
import Layout from '../components/shared/Layout'
import AdminTestDetailSkeleton from '../components/admin/AdminTestDetailSkeleton'
import TestHeader from '../components/admin/TestHeader'
import EmptyQuestionsState from '../components/admin/EmptyQuestionsState'

export default function AdminTestDetail() {
  const { testId } = useParams()
  const navigate = useNavigate()
  const {
    test,
    questions,
    loading,
    updateTestDetails,
    addQuestion,
    addQuestionsJSON,
    uploadQuestionsFile,
    deleteQuestion,
    updateQuestion,
    uploadImage,
    deleteImage,
  } = useAdminTest(testId)

  const [mode, setMode] = useState(null)
  const [isEditingTest, setIsEditingTest] = useState(false)
  const [testForm, setTestForm] = useState({ title: '', description: '', duration_minutes: 180 })
  const [savingTest, setSavingTest] = useState(false)

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
      await updateTestDetails(payload)
      setIsEditingTest(false)
      toast.success('Test updated')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update test')
    } finally {
      setSavingTest(false)
    }
  }, [testForm, updateTestDetails])

  const closeMode = useCallback(() => setMode(null), [])
  const openJsonMode = useCallback(() => setMode('json'), [])
  const openManualMode = useCallback(() => setMode('manual'), [])
  const toggleJsonMode = useCallback(() => setMode(current => (current === 'json' ? null : 'json')), [])
  const toggleManualMode = useCallback(() => setMode(current => (current === 'manual' ? null : 'manual')), [])
  const previewTest = useCallback(() => navigate(`/tests/${testId}?preview=true`), [navigate, testId])

  const handleAddQuestion = useCallback(async (question) => {
    await addQuestion(question)
    setMode(null)
  }, [addQuestion])

  if (loading) return <AdminTestDetailSkeleton />

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in max-w-3xl">
        <div>
          <Link to="/admin/tests" className="flex items-center gap-1.5 theme-muted hover:opacity-80 text-sm mb-4 w-fit">
            <ArrowLeft size={15}/> Back to Tests
          </Link>
          <TestHeader
            test={test}
            questionsCount={questions.length}
            isEditingTest={isEditingTest}
            testForm={testForm}
            setTestForm={setTestForm}
            savingTest={savingTest}
            onStartEdit={startEditingTest}
            onSaveTest={saveTest}
            onCancelEdit={() => setIsEditingTest(false)}
            mode={mode}
            onPreview={previewTest}
            onToggleJson={toggleJsonMode}
            onToggleManual={toggleManualMode}
          />
        </div>

        {mode === 'manual' && <QuestionForm onAdd={handleAddQuestion} onClose={closeMode} />}
        {mode === 'json' && (
          <JSONUploadForm onAdd={addQuestionsJSON} onUploadFile={uploadQuestionsFile} onClose={closeMode} />
        )}

        <div className="space-y-2">
          {questions.length === 0 ? (
            <EmptyQuestionsState onOpenJson={openJsonMode} onOpenManual={openManualMode} />
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
