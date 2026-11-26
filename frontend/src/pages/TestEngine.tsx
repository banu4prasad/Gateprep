import { useState } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import clsx from 'clsx'
import { ALERT_STYLE } from '../components/shared/alertStyles'
import { cn } from '@/lib/utils'
import QuestionView from '../components/test/QuestionView'
import TestHeader from '../components/test/TestHeader'
import TestEngineStageGate from '../components/test/TestEngineStageGate'
import TestEngineSidebar from '../components/test/TestEngineSidebar'
import TestEngineOverlays from '../components/test/TestEngineOverlays'
import QuestionPaletteSheet from '../components/test/QuestionPaletteSheet'
import useTestEngine from '../hooks/useTestEngine'
import { isFullLengthExam } from '../utils/testEngineUtils'

export default function TestEngine() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [fsNoticeDismissed, setFsNoticeDismissed] = useState(false)
  const engine = useTestEngine()
  const {
    accepted, answered, answers, attemptNumber, beginTest, clearResponse,
    commitNAT, current, currentQuestion, doSubmit, endTimeMs, fsViolations,
    fullscreenUnavailable, handleBack, handleTimerExpire, loadError, loadStatus,
    loading, markAndNext, marked, maxAttempts, natInput, navigate, notAnswered,
    notVisited, questionGroups, questions, retryLoad, saveAndNext, setAccepted, setCurrent,
    setMCQ, updateNatInput, setShowCalc, setShowConfirm, setShowFsWarning,
    setShowPalette, showCalc, showConfirm, showFsWarning, showPalette, started,
    starting, submitting, test, toggleMSQ, totalViolations, visited,
  } = engine

  const sidebar = (
    <TestEngineSidebar
      answered={answered}
      answers={answers}
      currentQuestion={currentQuestion}
      marked={marked}
      notAnswered={notAnswered}
      notVisited={notVisited}
      setCurrent={setCurrent}
      setShowPalette={setShowPalette}
      setShowConfirm={setShowConfirm}
      questionGroups={questionGroups}
      questions={questions}
      submitting={submitting}
      visited={visited}
      isFullLength={isFullLengthExam(test?.test_type, questions)}
      onToggleCollapse={() => setSidebarCollapsed(c => !c)}
    />
  )

  return (
    <TestEngineStageGate
      loading={loading}
      loadStatus={loadStatus}
      loadError={loadError}
      started={started}
      currentQuestion={currentQuestion}
      accepted={accepted}
      beginTest={beginTest}
      navigate={navigate}
      onBack={handleBack}
      onRetry={retryLoad}
      setAccepted={setAccepted}
      starting={starting}
      test={test}
    >
      <div className="theme-surface h-dvh flex flex-col overflow-hidden select-none">
        <TestEngineOverlays
          endTimeMs={endTimeMs}
          fsViolations={fsViolations}
          handleTimerExpire={handleTimerExpire}
          setShowConfirm={setShowConfirm}
          setShowFsWarning={setShowFsWarning}
          showFsWarning={showFsWarning}
          showCalc={showCalc}
          setShowCalc={setShowCalc}
          showConfirm={showConfirm}
          answered={answered}
          doSubmit={doSubmit}
          marked={marked}
          notAnswered={notAnswered}
          notVisited={notVisited}
          questions={questions}
          submitting={submitting}
        />

        <TestHeader
          attemptNumber={attemptNumber}
          endTimeMs={endTimeMs}
          handleTimerExpire={handleTimerExpire}
          maxAttempts={maxAttempts}
          onSubmitClick={() => setShowConfirm(true)}
          setShowCalc={setShowCalc}
          showCalc={showCalc}
          submitting={submitting}
          test={test}
          totalViolations={totalViolations}
        />

        {fullscreenUnavailable && !fsNoticeDismissed && (
          <div
            role="status"
            className={cn(
              ALERT_STYLE.info,
              'flex items-center justify-between gap-3 sm:px-4 rounded-none border-x-0 border-t-0 text-xs sm:text-sm flex-shrink-0',
            )}
          >
            <span>
              Fullscreen mode is unavailable in this browser. Continuing test without fullscreen.
            </span>
            <button
              type="button"
              onClick={() => setFsNoticeDismissed(true)}
              aria-label="Dismiss fullscreen notice"
              className="p-1 rounded hover:bg-sky-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {currentQuestion && <QuestionView
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
            setNatInput={updateNatInput}
            toggleMSQ={toggleMSQ}
          />}

          <div
            className={clsx(
              'hidden md:flex border-l flex-col flex-shrink-0 overflow-y-auto theme-sidebar-surface transition-all duration-200',
              sidebarCollapsed ? 'w-0 border-l-0 overflow-hidden' : 'w-60'
            )}
            aria-hidden={sidebarCollapsed}
          >
            {!sidebarCollapsed && sidebar}
          </div>

          {sidebarCollapsed && (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Expand sidebar"
              title="Expand Question Palette"
              className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-30 items-center gap-1.5 py-3 px-2 bg-card hover:bg-muted border border-r-0 border-border text-foreground rounded-l-md shadow-md transition-colors text-xs font-semibold select-none group"
            >
              <ChevronLeft size={16} className="text-primary group-hover:-translate-x-0.5 transition-transform" />
              <span className="[writing-mode:vertical-rl] tracking-wider text-[11px] text-muted-foreground group-hover:text-foreground">
                Question Palette
              </span>
            </button>
          )}

          <QuestionPaletteSheet
            current={current}
            questions={questions}
            showPalette={showPalette}
            setShowPalette={setShowPalette}
          >
            {sidebar}
          </QuestionPaletteSheet>
        </div>
      </div>
    </TestEngineStageGate>
  )
}
