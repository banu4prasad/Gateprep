import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import Maximize from 'lucide-react/dist/esm/icons/maximize'
import Spinner from '../components/shared/Spinner'
import Calculator from '../components/test/Calculator'
import QuestionView from '../components/test/QuestionView'
import TestHeader from '../components/test/TestHeader'
import TestSidebar from '../components/test/TestSidebar'
import TimerDisplay from '../components/test/TimerDisplay'
import useTestEngine from '../hooks/useTestEngine'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center theme-surface">
      <Spinner size={36} className="text-sky-500" />
    </div>
  )
}

function InstructionScreen({
  accepted,
  beginTest,
  navigate,
  setAccepted,
  starting,
  test,
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl animate-fade-in border-border">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold mb-1">General Instructions</CardTitle>
            <p className="text-sm text-muted-foreground">{test?.title}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/tests')}>
            Back
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {[
            ['Duration', `${test?.duration_minutes || 0} min`],
            ['Questions', test?.question_count || 0],
            ['Marks', test?.total_marks || 0],
          ].map(([label, value]) => (
            <div key={label} className="bg-muted rounded border p-3 text-center">
              <p className="text-xs mb-1 text-muted-foreground">{label}</p>
              <p className="font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3 text-sm mb-6 text-muted-foreground">
          <p>The test opens in fullscreen mode after you click Begin Test.</p>
          <p>Leaving fullscreen or switching tabs may be counted as a violation.</p>
          <p>The timer starts only after the attempt is created.</p>
        </div>

        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={event => setAccepted(event.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-foreground">
            I have read and understood the instructions.
          </span>
        </label>

        <Button
          onClick={beginTest}
          disabled={!accepted || starting}
          className="w-full h-11 text-base font-medium"
        >
          {starting ? <Spinner size={18} className="mr-2" /> : <Maximize size={18} className="mr-2" />}
          {starting ? 'Starting Test...' : 'Begin Test'}
        </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function EmptyQuestionsScreen({ navigate }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md text-center border-border">
        <CardContent className="p-6 pt-8">
          <AlertTriangle size={36} className="text-amber-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold mb-2 text-foreground">No Questions Available</h1>
          <p className="text-sm mb-5 text-muted-foreground">
            This test does not have any questions to display.
          </p>
          <Button onClick={() => navigate('/tests')} className="w-full">
            Back to Tests
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function FullscreenWarning({
  endTimeMs,
  fsViolations,
  handleTimerExpire,
  setShowConfirm,
  setShowFsWarning,
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center theme-danger-backdrop">
      <div className="text-center max-w-sm p-8 rounded-xl border border-red-500/40 theme-card-bg">
        <AlertTriangle size={44} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2 theme-text">You exited fullscreen!</h2>
        <p className="text-sm mb-1 theme-muted">The timer is still running.</p>
        <p className="text-red-400 font-semibold mb-1">Violation {fsViolations}/3</p>
        <p className="text-xs mb-5 theme-muted">3 violations = test auto-submitted</p>
        <TimerDisplay
          endTime={endTimeMs}
          onExpire={handleTimerExpire}
          announceWarnings={false}
          className="text-3xl font-mono font-bold mb-6"
          lowClassName="text-red-400 timer-critical"
          normalClassName="theme-text"
        />
        <div className="space-y-3">
          <button
            onClick={() => {
              document.documentElement.requestFullscreen?.()
                .then(() => setShowFsWarning(false))
                .catch(() => setShowFsWarning(false))
            }}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Maximize size={16} /> Return to Fullscreen
          </button>
          <button
            onClick={() => {
              setShowFsWarning(false)
              setShowConfirm(true)
            }}
            className="btn-danger w-full"
          >
            Submit Test Now
          </button>
        </div>
      </div>
    </div>
  )
}



function ConfirmSubmitModal({
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
          <AlertTriangle size={22} className="text-amber-400" />
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

export default function TestEngine() {
  const engine = useTestEngine()
  const {
    accepted,
    answered,
    answers,
    attemptNumber,
    beginTest,
    clearResponse,
    commitNAT,
    current,
    currentQuestion,
    doSubmit,
    endTimeMs,
    fsViolations,
    handleTimerExpire,
    loading,
    markAndNext,
    marked,
    maxAttempts,
    natInput,
    navigate,
    notAnswered,
    questions,
    saveAndNext,
    setAccepted,
    setCurrent,
    setMCQ,
    setNatInput,
    setShowCalc,
    setShowConfirm,
    setShowFsWarning,
    setShowPalette,
    showCalc,
    showConfirm,
    showFsWarning,
    showPalette,
    started,
    starting,
    subjects,
    submitting,
    test,
    toggleMSQ,
    totalViolations,
    visited,
  } = engine

  if (loading) return <LoadingScreen />

  if (!started) {
    return (
      <InstructionScreen
        accepted={accepted}
        beginTest={beginTest}
        navigate={navigate}
        setAccepted={setAccepted}
        starting={starting}
        test={test}
      />
    )
  }

  if (!currentQuestion) return <EmptyQuestionsScreen navigate={navigate} />

  const sidebar = (
    <TestSidebar
      answered={answered}
      answers={answers}
      currentQuestion={currentQuestion}
      marked={marked}
      notAnswered={notAnswered}
      onQuestionSelect={(index) => {
        setCurrent(index)
        setShowPalette(false)
      }}
      onSubmitClick={() => setShowConfirm(true)}
      questions={questions}
      submitting={submitting}
      subjects={subjects}
      visited={visited}
    />
  )

  return (
    <div className="theme-surface h-screen flex flex-col overflow-hidden select-none">
      {showFsWarning && (
        <FullscreenWarning
          endTimeMs={endTimeMs}
          fsViolations={fsViolations}
          handleTimerExpire={handleTimerExpire}
          setShowConfirm={setShowConfirm}
          setShowFsWarning={setShowFsWarning}
        />
      )}

      <TestHeader
        attemptNumber={attemptNumber}
        currentQuestion={currentQuestion}
        endTimeMs={endTimeMs}
        handleTimerExpire={handleTimerExpire}
        maxAttempts={maxAttempts}
        onSubmitClick={() => setShowConfirm(true)}
        questions={questions}
        setCurrent={setCurrent}
        setShowCalc={setShowCalc}
        showCalc={showCalc}
        subjects={subjects}
        submitting={submitting}
        test={test}
        totalViolations={totalViolations}
      />

      <div className="flex flex-1 overflow-hidden">
        <QuestionView
          answers={answers}
          clearResponse={clearResponse}
          commitNAT={commitNAT}
          current={current}
          markAndNext={markAndNext}
          natInput={natInput}
          question={currentQuestion}
          questions={questions}
          saveAndNext={saveAndNext}
          setCurrent={setCurrent}
          setMCQ={setMCQ}
          setNatInput={setNatInput}
          toggleMSQ={toggleMSQ}
        />

        <div className="hidden md:flex w-52 border-l flex-col flex-shrink-0 overflow-y-auto theme-sidebar-surface">
          {sidebar}
        </div>

        <Sheet open={showPalette} onOpenChange={setShowPalette}>
          <SheetTrigger asChild>
            <Button
              className="md:hidden fixed bottom-16 right-4 z-30 flex items-center gap-1.5 rounded-full shadow-lg"
              size="sm"
            >
              Q{current + 1}/{questions.length}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] sm:w-80 p-0 overflow-y-auto">
            <SheetHeader className="p-3 border-b text-left px-4">
              <SheetTitle className="text-sm">Question Palette</SheetTitle>
            </SheetHeader>
            {sidebar}
          </SheetContent>
        </Sheet>
      </div>

      {showCalc && <Calculator onClose={() => setShowCalc(false)} />}

      {showConfirm && (
        <ConfirmSubmitModal
          answered={answered}
          doSubmit={doSubmit}
          marked={marked}
          notAnswered={notAnswered}
          questions={questions}
          setShowConfirm={setShowConfirm}
          submitting={submitting}
        />
      )}
    </div>
  )
}
