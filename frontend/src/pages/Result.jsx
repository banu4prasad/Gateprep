import { useState, useMemo, memo, useCallback } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import { testAPI, bookmarkAPI, fetcher } from '../api/api'
import useSWR, { mutate as globalMutate } from 'swr'
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
import Spinner from '../components/shared/Spinner'
import MathText from '../components/shared/MathText'
import toast from 'react-hot-toast'
import clsx from 'clsx'

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

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]))
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-IN')
}

function buildResultHtml(result) {
  const rows = (result.answers || []).map((a, idx) => {
    const status = a.is_correct === true ? 'Correct' : a.is_correct === false ? 'Wrong' : 'Skipped'
    const options = (a.options || []).map((opt, i) => {
      const letter = 'ABCD'[i] || `${i + 1}`
      return `<li><strong>${letter}.</strong> ${escapeHtml(opt)}</li>`
    }).join('')

    return `
      <section class="question">
        <div class="q-head">
          <strong>Q${idx + 1}</strong>
          <span class="${status.toLowerCase()}">${status}</span>
          <span>${escapeHtml(a.marks_awarded)} marks</span>
        </div>
        <p>${escapeHtml(a.question_text)}</p>
        ${options ? `<ol>${options}</ol>` : ''}
        <div class="answers">
          <span>Your answer: <strong>${escapeHtml(a.selected_answer || 'Skipped')}</strong></span>
          <span>Correct answer: <strong>${escapeHtml(a.correct_answer)}</strong></span>
          <span>Time: <strong>${escapeHtml(a.time_spent_seconds)}s</strong></span>
        </div>
      </section>`
  }).join('')

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(result.test_title)} result</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #111827; line-height: 1.45; }
    header { border-bottom: 1px solid #d1d5db; margin-bottom: 20px; padding-bottom: 16px; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-top: 16px; }
    .metric { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
    .metric strong { display: block; font-size: 20px; }
    .question { border: 1px solid #d1d5db; border-radius: 8px; padding: 14px; margin: 12px 0; break-inside: avoid; }
    .q-head, .answers { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .q-head { justify-content: space-between; margin-bottom: 8px; }
    .correct { color: #15803d; }
    .wrong { color: #b91c1c; }
    .skipped { color: #64748b; }
    ol { margin: 8px 0; padding-left: 20px; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(result.test_title)}</h1>
    <div>Attempt ${escapeHtml(result.attempt_number)} · ${result.counts_for_leaderboard ? 'Saved first attempt' : 'Practice attempt'} · ${escapeHtml(formatDate(result.submitted_at))}</div>
    <div class="summary">
      <div class="metric"><span>Score</span><strong>${escapeHtml(result.score?.toFixed?.(2) ?? result.score)} / ${escapeHtml(result.total_marks)}</strong></div>
      <div class="metric"><span>Percentage</span><strong>${escapeHtml(Math.round(result.percentage))}%</strong></div>
      <div class="metric"><span>Correct</span><strong>${escapeHtml(result.correct)}</strong></div>
      <div class="metric"><span>Wrong</span><strong>${escapeHtml(result.incorrect)}</strong></div>
      <div class="metric"><span>Skipped</span><strong>${escapeHtml(result.skipped)}</strong></div>
    </div>
  </header>
  ${rows}
</body>
</html>`
}

function downloadResultReport(result) {
  const slug = (result.test_title || 'result').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const suffix = result.counts_for_leaderboard ? 'result' : 'practice-result'
  const blob = new Blob([buildResultHtml(result)], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${slug || 'test'}-${suffix}.html`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

const QuestionReview = memo(function QuestionReview({ qa, idx, isBookmarked, onToggleBookmark }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="gate-card overflow-hidden mb-2">
      <div className="flex items-start gap-3 p-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-500 rounded outline-none" role="button" tabIndex={0} aria-expanded={open} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } }} onClick={() => setOpen(o => !o)}>
        <span className="text-xs font-mono mt-0.5 w-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Q{idx + 1}</span>
        {qa.is_correct === true ? <CheckCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5" /> :
         qa.is_correct === false ? <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" /> :
         <MinusCircle size={14} className="text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />}
        <div className="text-sm flex-1 line-clamp-2" style={{ color: 'var(--text)' }}><MathText>{qa.question_text}</MathText></div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={clsx('text-xs font-mono font-semibold',
            qa.marks_awarded > 0 ? 'text-green-400' : qa.marks_awarded < 0 ? 'text-red-400' : 'text-slate-500 dark:text-slate-400')}>
            {qa.marks_awarded > 0 ? '+' : ''}{qa.marks_awarded}
          </span>
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <Clock size={10} /> {qa.time_spent_seconds}s
          </span>
          <button onClick={e => { e.stopPropagation(); onToggleBookmark(qa.question_id) }} aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
            className={clsx('p-2 rounded transition-colors', isBookmarked ? 'text-sky-400' : 'text-slate-600 hover:text-sky-400')}>
            {isBookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          </button>
          {open ? <ChevronUp size={13} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-3 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
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
                    'border text-slate-500 dark:text-slate-400')} style={{ borderColor: 'var(--border)' }}>
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
              <div className="px-3 py-2 rounded border text-slate-500 dark:text-slate-400" style={{ borderColor: 'var(--border)' }}>
                You: <span className="font-mono">{qa.selected_answer || 'Skipped'}</span>
              </div>
            </div>
          )}
          {/* Topper time comparison */}
          {qa.topper_time_seconds > 0 && (
            <div className="flex items-center gap-4 text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              <span>Your time: <strong>{qa.time_spent_seconds}s</strong></span>
              <span>Topper time: <strong className="text-amber-400">{qa.topper_time_seconds}s</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

export default function ResultPage() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [filter, setFilter] = useState('all')

  const isPractice = attemptId?.startsWith('practice-')
  
  const { data: serverResult, isLoading: resultLoading } = useSWR(
    isPractice ? null : `/tests/attempt/${attemptId}/result`, 
    fetcher
  )

  const result = useMemo(() => {
    if (isPractice) {
      if (location.state?.result) return location.state.result
      try { return JSON.parse(sessionStorage.getItem(`practice-result:${attemptId}`)) } catch { return null }
    }
    return serverResult
  }, [isPractice, location.state, attemptId, serverResult])

  const { data: bData, isLoading: bLoading, mutate: mutateBookmarks } = useSWR('/bookmarks/ids', fetcher)
  const bookmarked = useMemo(() => new Set(bData?.ids || []), [bData])

  const testId = result?.test_id
  const { data: attemptsData } = useSWR(testId && !isPractice ? `/tests/${testId}/my-attempts` : null, fetcher)
  const attempts = attemptsData || []

  const loading = isPractice ? bLoading : (resultLoading || bLoading)

  const toggleBookmark = useCallback(async (qId) => {
    const res = await bookmarkAPI.toggle(qId)
    mutateBookmarks((prev) => {
      const nextIds = new Set(prev?.ids || [])
      res.data.bookmarked ? nextIds.add(qId) : nextIds.delete(qId)
      return { ...prev, ids: Array.from(nextIds) }
    }, false)
    globalMutate('/bookmarks')
    toast(res.data.bookmarked ? 'Bookmarked' : 'Bookmark removed', { duration: 1500 })
  }, [mutateBookmarks])

  const reattempt = () => {
    if (result.attempts_remaining <= 0) {
      toast.error('Maximum attempts reached for this test')
      return
    }
    // Just navigate — TestEngine calls startTest on load
    navigate(`/tests/${result.test_id}`)
  }

  const handleDownload = () => {
    downloadResultReport(result)
    toast.success('Result downloaded')
  }

  const filtered = useMemo(() => {
    if (!result?.answers) return []
    return result.answers.filter(a =>
      filter === 'all' ? true :
      filter === 'correct' ? a.is_correct === true :
      filter === 'incorrect' ? a.is_correct === false :
      a.is_correct === null
    )
  }, [result?.answers, filter])

  if (loading) return <Layout><div className="flex justify-center py-16"><Spinner size={28} className="text-sky-500" /></div></Layout>
  if (!result) return <Layout><p className="text-center py-16" style={{ color: 'var(--text-muted)' }}>Result not found.</p></Layout>

  const pct = Math.round(result.percentage)
  const grade = pct >= 75 ? 'Excellent' : pct >= 50 ? 'Good' : 'Needs Work'
  const gradeColor = pct >= 75 ? 'text-green-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'
  const rankText = result.rank
    ? result.counts_for_leaderboard
      ? ` · Rank #${result.rank}/${result.total_participants}`
      : ` · First-attempt rank #${result.rank}/${result.total_participants}`
    : ''

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Link to="/dashboard" className="flex items-center gap-1.5 text-sm hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={handleDownload}
              className="flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300">
              <Download size={13} /> Download
            </button>
            <Link to={`/tests/${result.test_id}/leaderboard`}
              className="flex items-center gap-1.5 text-sm text-sky-400 hover:text-sky-300">
              <Trophy size={13} /> Leaderboard
            </Link>
          </div>
        </div>

        {/* Attempt badge */}
        <div className={clsx('flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm rounded border',
          result.counts_for_leaderboard ? 'border-sky-500/20 text-sky-300' : 'border-amber-500/20 text-amber-300')}
          style={{ background: result.counts_for_leaderboard ? 'rgba(14,165,233,0.08)' : 'rgba(245,158,11,0.08)' }}>
          <Medal size={14} />
          {result.counts_for_leaderboard
            ? `Attempt ${result.attempt_number} · ✓ Counts for leaderboard`
            : `Attempt ${result.attempt_number} · Practice result (download to keep)`}
        </div>

        {/* Score card */}
        <div className="gate-card p-5">
          <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--text)' }}>
            <Trophy size={16} className="inline text-amber-400 mr-2" />{result.test_title}
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <ScoreRing pct={pct} />
            <div className="flex-1 w-full">
              <p className={`font-bold text-2xl mb-1 ${gradeColor}`}>{grade}</p>
              <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
                {result.score?.toFixed(2)} / {result.total_marks} marks{rankText}
              </p>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  ['Correct', result.correct, 'text-green-400', 'rgba(81,207,102,0.1)', 'rgba(81,207,102,0.2)'],
                  ['Wrong', result.incorrect, 'text-red-400', 'rgba(255,107,107,0.1)', 'rgba(255,107,107,0.2)'],
                  ['Skipped', result.skipped, 'text-slate-500 dark:text-slate-400', 'rgba(100,116,139,0.1)', 'rgba(100,116,139,0.2)'],
                ].map(([label, val, cls, bg, border]) => (
                  <div key={label} className="rounded p-2 text-center" style={{ background: bg, border: `1px solid ${border}` }}>
                    <p className={`text-xl font-bold ${cls}`}>{val}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Comparison stats */}
        <div className="gate-card p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <TrendingUp size={15} className="text-sky-400" /> Performance Comparison
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Your Score', val: result.score?.toFixed(1), pct: Math.round(result.percentage), color: 'var(--info-text)' },
              ...(result.topper ? [{ label: `Topper (${result.topper.full_name})`, val: result.topper.score?.toFixed(1), pct: Math.round(result.topper.percentage), color: 'var(--success-text)' }] : []),
            ].map(({ label, val, pct: p, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className="font-semibold" style={{ color }}>{val} ({p}%)</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: 'var(--border)' }}>
                  <div className="h-2 rounded-full transition-all" style={{ width: `${p}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attempt history */}
        {attempts.length > 1 && (
          <div className="gate-card p-4">
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>Your Attempts</h3>
            <div className="space-y-2">
              {attempts.map(a => (
                <div key={a.attempt_id} className={clsx('flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 rounded border',
                  a.attempt_id === parseInt(attemptId) ? 'border-sky-500/30' : '')}
                  style={{ borderColor: a.attempt_id === parseInt(attemptId) ? undefined : 'var(--border)', background: a.attempt_id === parseInt(attemptId) ? 'rgba(14,165,233,0.06)' : 'transparent' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>#{a.attempt_number}</span>
                    {a.counts_for_leaderboard ? <span className="badge badge-blue text-xs">Leaderboard</span> : <span className="badge badge-amber text-xs">Practice</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{a.score?.toFixed(1)}/{a.total_marks} ({a.percentage}%)</span>
                    {a.attempt_id !== parseInt(attemptId) && (
                      <Link to={`/results/${a.attempt_id}`} className="text-xs text-sky-400">View →</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Link to={`/tests/${result.test_id}/leaderboard`} className="btn-ghost flex-1 flex items-center justify-center gap-2 text-sm">
            <Trophy size={14} /> Leaderboard
          </Link>
          <button onClick={reattempt} disabled={result.attempts_remaining <= 0} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
            <RotateCcw size={14} />
            Reattempt {result.attempts_remaining > 0 ? `(${result.attempts_remaining} left)` : '(max reached)'}
          </button>
        </div>

        {/* Question review */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <h3 className="font-semibold" style={{ color: 'var(--text)' }}>
              Question Review
              <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>(click bookmark icon)</span>
            </h3>
            <div className="flex flex-wrap gap-1 p-1 rounded" style={{ background: 'var(--bg-card)' }}>
              {['all', 'correct', 'incorrect', 'skipped'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={clsx('px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors',
                    filter === f ? 'bg-sky-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200')}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          {filtered.map((a, idx) => (
            <QuestionReview key={a.question_id} qa={a} idx={result.answers.indexOf(a)}
              isBookmarked={bookmarked.has(a.question_id)} onToggleBookmark={toggleBookmark} />
          ))}
          {filtered.length === 0 && <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No questions in this category</p>}
        </div>
      </div>
    </Layout>
  )
}
