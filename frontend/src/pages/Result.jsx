import { useState, useMemo, memo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import { testAPI } from '../api/api'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import XCircle from 'lucide-react/dist/esm/icons/x-circle'
import MinusCircle from 'lucide-react/dist/esm/icons/minus-circle'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up'
import Trophy from 'lucide-react/dist/esm/icons/trophy'
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw'
import Medal from 'lucide-react/dist/esm/icons/medal'
import Bookmark from 'lucide-react/dist/esm/icons/bookmark'
import BookmarkCheck from 'lucide-react/dist/esm/icons/bookmark-check'
import Clock from 'lucide-react/dist/esm/icons/clock'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import Download from 'lucide-react/dist/esm/icons/download'
import MathText from '../components/shared/MathText'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { downloadResultReport } from '../utils/reportGenerator'
import { ResultSkeleton } from '../components/shared/Skeletons'
import { useResultData } from '../hooks/useResultData'

function ScoreRing({ pct }) {
  const r = 48, c = 2 * Math.PI * r
  const filled = (pct / 100) * c
  const color = pct >= 75 ? 'var(--success-text)' : pct >= 50 ? 'var(--warning-text)' : 'var(--danger-text)'
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="10"/>
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${filled} ${c}`} strokeLinecap="round" transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dasharray 1s ease' }}/>
      <text x="60" y="56" textAnchor="middle" fill="var(--text)" fontSize="20" fontWeight="700" fontFamily="Syne">{pct}%</text>
      <text x="60" y="72" textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontFamily="DM Sans">score</text>
    </svg>
  )
}

const QuestionReview = memo(function QuestionReview({ qa, idx, isBookmarked, onToggleBookmark }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="gate-card overflow-hidden mb-2">
      <div className="flex items-start gap-3 p-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-500 rounded outline-none" role="button" tabIndex={0} aria-expanded={open} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } }} onClick={() => setOpen(o => !o)}>
        <span className="text-xs font-mono mt-0.5 w-5 flex-shrink-0 theme-muted">Q{idx + 1}</span>
        {qa.is_correct === true ? <CheckCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5" /> :
         qa.is_correct === false ? <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" /> :
         <MinusCircle size={14} className="text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />}
        <div className="text-sm flex-1 line-clamp-2 theme-text"><MathText>{qa.question_text}</MathText></div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={clsx('text-xs font-mono font-semibold',
            qa.marks_awarded > 0 ? 'text-green-400' : qa.marks_awarded < 0 ? 'text-red-400' : 'text-slate-500 dark:text-slate-400')}>
            {qa.marks_awarded > 0 ? '+' : ''}{qa.marks_awarded}
          </span>
          <span className="text-xs flex items-center gap-1 theme-muted">
            <Clock size={10} /> {qa.time_spent_seconds}s
          </span>
          <button onClick={e => { e.stopPropagation(); onToggleBookmark(qa.question_id) }} aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
            className={clsx('p-2 rounded transition-colors', isBookmarked ? 'text-sky-400' : 'text-slate-600 hover:text-sky-400')}>
            {isBookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          </button>
          {open ? <ChevronUp size={13} className="theme-muted" /> : <ChevronDown size={13} className="theme-muted" />}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-3 border-t space-y-2 theme-border">
          {/* Options */}
          {qa.options?.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
              {qa.options.map((o, i) => {
                const l = 'ABCD'[i]
                const isCorrect = qa.correct_answer?.includes(l)
                const isSelected = qa.selected_answer?.includes(l)
                const isTopperPick = qa.topper_answer?.includes(l)
                return (
                  <div key={i} className={clsx('px-3 py-2 rounded text-xs',
                    isCorrect ? 'bg-green-500/10 border border-green-500/20 text-green-300' :
                    isSelected ? 'bg-red-500/10 border border-red-500/20 text-red-300' :
                    'border text-slate-500 dark:text-slate-400 theme-border')}>
                    <span className="font-mono font-semibold mr-1">{l}.</span><MathText>{o}</MathText>
                    {isCorrect && <span className="ml-1 text-green-400">✓</span>}
                    {isSelected && !isCorrect && <span className="ml-1 text-red-400">✗</span>}
                    {isTopperPick && !isSelected && <span className="ml-1 text-amber-400">★ Topper</span>}
                  </div>
                )
              })}
            </div>
          )}
          {qa.question_type === 'nat' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-xs">
              <div className="px-3 py-2 rounded bg-green-500/10 border border-green-500/20 text-green-300">
                ✓ Correct: <span className="font-mono">{qa.correct_answer}</span>
              </div>
              <div className="px-3 py-2 rounded border text-slate-500 dark:text-slate-400 theme-border">
                You: <span className="font-mono">{qa.selected_answer || 'Skipped'}</span>
              </div>
            </div>
          )}
          {/* Topper time comparison */}
          {qa.topper_time_seconds > 0 && (
            <div className="flex items-center gap-4 text-xs mt-1 theme-muted">
              <span>Your time: <strong>{qa.time_spent_seconds}s</strong></span>
              <span>Topper time: <strong className="text-amber-400">{qa.topper_time_seconds}s</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

/* ── Derived summary ── */

function useResultSummary(result) {
  return useMemo(() => {
    const pct = Math.round(result.percentage)
    const grade = pct >= 75 ? 'Excellent' : pct >= 50 ? 'Good' : 'Needs Work'
    const gradeColor = pct >= 75 ? 'text-green-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'
    const rankText = result.rank
      ? result.counts_for_leaderboard
        ? ` · Rank #${result.rank}/${result.total_participants}`
        : ` · First-attempt rank #${result.rank}/${result.total_participants}`
      : ''
    return { pct, grade, gradeColor, rankText }
  }, [result])
}

/* ── Section components ── */

const ResultHeader = memo(function ResultHeader({ result, onDownload }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <Link to="/dashboard" className="flex items-center gap-1.5 text-sm hover:opacity-80 theme-muted">
        <ArrowLeft size={14} /> Dashboard
      </Link>
      <div className="flex items-center gap-3">
        <button onClick={onDownload}
          className="flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300">
          <Download size={13} /> Download
        </button>
        <Link to={`/tests/${result.test_id}/leaderboard`}
          className="flex items-center gap-1.5 text-sm text-sky-400 hover:text-sky-300">
          <Trophy size={13} /> Leaderboard
        </Link>
      </div>
    </div>
  )
})

const AttemptBadge = memo(function AttemptBadge({ result }) {
  return (
    <div className={clsx('flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm rounded border',
      result.counts_for_leaderboard ? 'result-attempt-leaderboard' : 'result-attempt-practice')}>
      <Medal size={14} />
      {result.counts_for_leaderboard
        ? `Attempt ${result.attempt_number} · ✓ Counts for leaderboard`
        : `Attempt ${result.attempt_number} · Practice result (download to keep)`}
    </div>
  )
})

const ScoreCard = memo(function ScoreCard({ result, summary }) {
  const { pct, grade, gradeColor, rankText } = summary
  return (
    <div className="gate-card p-5">
      <h2 className="font-bold text-lg mb-4 theme-text">
        <Trophy size={16} className="inline text-amber-400 mr-2" />{result.test_title}
      </h2>
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <ScoreRing pct={pct} />
        <div className="flex-1 w-full">
          <p className={`font-bold text-2xl mb-1 ${gradeColor}`}>{grade}</p>
          <p className="text-sm mb-1 theme-muted">
            {result.score?.toFixed(2)} / {result.total_marks} marks{rankText}
          </p>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              ['Correct', result.correct, 'text-green-400', 'result-stat-correct'],
              ['Wrong', result.incorrect, 'text-red-400', 'result-stat-wrong'],
              ['Skipped', result.skipped, 'text-slate-500 dark:text-slate-400', 'result-stat-skipped'],
            ].map(([label, val, cls, statClass]) => (
              <div key={label} className={`rounded p-2 text-center ${statClass}`}>
                <p className={`text-xl font-bold ${cls}`}>{val}</p>
                <p className="text-xs theme-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
})

const ComparisonStats = memo(function ComparisonStats({ result }) {
  return (
    <div className="gate-card p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2 theme-text">
        <TrendingUp size={15} className="text-sky-400" /> Performance Comparison
      </h3>
      <div className="space-y-2">
        {[
          { label: 'Your Score', val: result.score?.toFixed(1), pct: Math.round(result.percentage), color: 'var(--info-text)' },
          ...(result.topper ? [{ label: `Topper (${result.topper.full_name})`, val: result.topper.score?.toFixed(1), pct: Math.round(result.topper.percentage), color: 'var(--success-text)' }] : []),
        ].map(({ label, val, pct: p, color }) => (
          <div key={label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="theme-muted">{label}</span>
              <span className="font-semibold" style={{ color }}>{val} ({p}%)</span>
            </div>
            <div className="h-2 rounded-full result-progress-track">
              <div className="h-2 rounded-full transition-all" style={{ width: `${p}%`, background: color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

const AttemptHistory = memo(function AttemptHistory({ attempts, currentAttemptId }) {
  if (attempts.length <= 1) return null
  return (
    <div className="gate-card p-4">
      <h3 className="font-semibold mb-3 theme-text">Your Attempts</h3>
      <div className="space-y-2">
        {attempts.map(a => (
          <div key={a.attempt_id} className={clsx('flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 rounded border theme-border',
            a.attempt_id === parseInt(currentAttemptId) && 'result-current-attempt')}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono theme-muted">#{a.attempt_number}</span>
              {a.counts_for_leaderboard ? <span className="badge badge-blue text-xs">Leaderboard</span> : <span className="badge badge-amber text-xs">Practice</span>}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium theme-text">{a.score?.toFixed(1)}/{a.total_marks} ({a.percentage}%)</span>
              {a.attempt_id !== parseInt(currentAttemptId) && (
                <Link to={`/results/${a.attempt_id}`} className="text-xs text-sky-400">View →</Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

const ResultActions = memo(function ResultActions({ result, onReattempt }) {
  return (
    <div className="flex gap-3">
      <Link to={`/tests/${result.test_id}/leaderboard`} className="btn-ghost flex-1 flex items-center justify-center gap-2 text-sm">
        <Trophy size={14} /> Leaderboard
      </Link>
      <button onClick={onReattempt} disabled={result.attempts_remaining <= 0} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
        <RotateCcw size={14} />
        Reattempt {result.attempts_remaining > 0 ? `(${result.attempts_remaining} left)` : '(max reached)'}
      </button>
    </div>
  )
})

const QuestionReviewList = memo(function QuestionReviewList({ items, filter, setFilter, bookmarked, onToggleBookmark }) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold theme-text">
          Question Review
          <span className="text-xs ml-2 theme-muted">(click bookmark icon)</span>
        </h3>
        <div className="flex flex-wrap gap-1 p-1 rounded theme-card-bg">
          {['all', 'correct', 'incorrect', 'skipped'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={clsx('px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors',
                filter === f ? 'bg-sky-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200')}>
              {f}
            </button>
          ))}
        </div>
      </div>
      {items.map(({ answer, idx }) => (
        <QuestionReview key={answer.question_id} qa={answer} idx={idx}
          isBookmarked={bookmarked.has(answer.question_id)} onToggleBookmark={onToggleBookmark} />
      ))}
      {items.length === 0 && <p className="text-center py-8 text-sm theme-muted">No questions in this category</p>}
    </div>
  )
})

/* ── Page ── */

export default function ResultPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const { attemptId, result, bookmarked, attempts, loading, toggleBookmark } = useResultData()

  const reattempt = useCallback(() => {
    if (result.attempts_remaining <= 0) {
      toast.error('Maximum attempts reached for this test')
      return
    }
    navigate(`/tests/${result.test_id}`)
  }, [result, navigate])

  const handleDownload = useCallback(() => {
    downloadResultReport(result)
    toast.success('Result downloaded')
  }, [result])

  const summary = useResultSummary(result || {})

  // O(n) instead of O(n²): carry original index through filter so
  // QuestionReview gets the correct question number without indexOf.
  const filteredItems = useMemo(() => {
    if (!result?.answers) return []
    return result.answers
      .map((a, idx) => ({ answer: a, idx }))
      .filter(({ answer: a }) =>
        filter === 'all' ? true :
        filter === 'correct' ? a.is_correct === true :
        filter === 'incorrect' ? a.is_correct === false :
        a.is_correct === null
      )
  }, [result?.answers, filter])

  if (loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Link to="/dashboard" className="flex items-center gap-1.5 text-sm hover:opacity-80 theme-muted">
              <ArrowLeft size={14} /> Dashboard
            </Link>
          </div>
          <ResultSkeleton />
        </div>
      </Layout>
    )
  }
  if (!result) return <Layout><p className="text-center py-16 theme-muted">Result not found.</p></Layout>

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
        <ResultHeader result={result} onDownload={handleDownload} />
        <AttemptBadge result={result} />
        <ScoreCard result={result} summary={summary} />
        <ComparisonStats result={result} />
        <AttemptHistory attempts={attempts} currentAttemptId={attemptId} />
        <ResultActions result={result} onReattempt={reattempt} />
        <QuestionReviewList
          items={filteredItems}
          filter={filter}
          setFilter={setFilter}
          bookmarked={bookmarked}
          onToggleBookmark={toggleBookmark}
        />
      </div>
    </Layout>
  )
}
