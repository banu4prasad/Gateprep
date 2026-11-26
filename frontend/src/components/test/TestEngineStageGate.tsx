import LoadingScreen from './LoadingScreen'
import InstructionScreen from './InstructionScreen'
import EmptyQuestionsScreen from './EmptyQuestionsScreen'
import TestNotFoundScreen from './TestNotFoundScreen'
import type { TestDetail, TestQuestion } from '@/types/api'
import type { TestLoadStatus } from '@/hooks/useTestLoader'

export interface TestEngineStageGateProps {
  loading: boolean
  loadStatus?: TestLoadStatus
  loadError?: string | null
  started: boolean
  currentQuestion?: TestQuestion
  accepted: boolean
  beginTest: () => Promise<void>
  navigate: (to: string) => void
  onBack?: () => void
  onRetry?: () => void
  setAccepted: React.Dispatch<React.SetStateAction<boolean>>
  starting: boolean
  test: TestDetail | null
  children?: React.ReactNode
}

export default function TestEngineStageGate({
  loading,
  loadStatus,
  loadError,
  started,
  currentQuestion,
  accepted,
  beginTest,
  navigate,
  onBack,
  onRetry,
  setAccepted,
  starting,
  test,
  children
}: TestEngineStageGateProps): React.ReactNode {
  if (loading) return <LoadingScreen />

  const fallbackBack = onBack ?? (() => navigate('/tests'))

  if (loadStatus === 'not_found' || loadStatus === 'error' || !test) {
    return (
      <TestNotFoundScreen
        status={loadStatus === 'error' ? 'error' : 'not_found'}
        errorMessage={loadError}
        onRetry={onRetry}
        onBack={fallbackBack}
      />
    )
  }

  if (!started) {
    return (
      <InstructionScreen
        accepted={accepted}
        beginTest={beginTest}
        navigate={navigate}
        onBack={fallbackBack}
        setAccepted={setAccepted}
        starting={starting}
        test={test}
      />
    )
  }

  if (!currentQuestion) return <EmptyQuestionsScreen navigate={navigate} onBack={fallbackBack} />

  return children
}
