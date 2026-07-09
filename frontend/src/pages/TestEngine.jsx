import Calculator from '../components/test/Calculator'
import QuestionView from '../components/test/QuestionView'
import TestHeader from '../components/test/TestHeader'
import TestSidebar from '../components/test/TestSidebar'
import LoadingScreen from '../components/test/LoadingScreen'
import InstructionScreen from '../components/test/InstructionScreen'
import EmptyQuestionsScreen from '../components/test/EmptyQuestionsScreen'
import FullscreenWarning from '../components/test/FullscreenWarning'
import ConfirmSubmitModal from '../components/test/ConfirmSubmitModal'
import QuestionPaletteSheet from '../components/test/QuestionPaletteSheet'
import useTestEngine from '../hooks/useTestEngine'

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
    questionGroups,
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
      questionGroups={questionGroups}
      questions={questions}
      submitting={submitting}
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

        <QuestionPaletteSheet
          current={current}
          questions={questions}
          showPalette={showPalette}
          setShowPalette={setShowPalette}
        >
          {sidebar}
        </QuestionPaletteSheet>
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
