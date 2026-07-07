import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import useSWR from 'swr'
import { fetcher } from '../api/api'
import { SUBJECTS, SERIES_LABELS, TYPE_LABELS } from '../utils/constants'
import Clock from 'lucide-react/dist/esm/icons/clock'
import BookOpen from 'lucide-react/dist/esm/icons/book-open'
import Target from 'lucide-react/dist/esm/icons/target'
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right'
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import Spinner from '../components/shared/Spinner'
import clsx from 'clsx'
import { TestCardSkeleton } from '../components/shared/Skeletons'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// ── Test Card ─────────────────────────────────────────────────────
function TestCard({ test, attempt }) {
  const done = attempt?.status === 'submitted'
  const pct = done && attempt?.total_marks
    ? Math.round(attempt.score / attempt.total_marks * 100) : null

  return (
    <Card className="flex flex-col hover:border-primary/50 transition-colors border-border">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-medium text-sm leading-snug">{test.title}</CardTitle>
          {done && <CheckCircle size={15} className="text-green-400 flex-shrink-0 mt-0.5" />}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1 flex flex-col gap-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock size={11} />{test.duration_minutes}m</span>
          <span className="flex items-center gap-1"><BookOpen size={11} />{test.question_count} Qs</span>
          <span className="flex items-center gap-1"><Target size={11} />{test.total_marks}M</span>
        </div>

        {pct !== null && (
          <div className={clsx('text-xs px-2.5 py-1.5 rounded',
            pct >= 75 ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
            pct >= 50 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
          )}>
            Score: {attempt.score?.toFixed(1)}/{attempt.total_marks} ({pct}%)
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0">
        {done ? (
          <Button asChild variant="outline" className="w-full border-sky-500/30 text-sky-600 hover:bg-sky-500/10 h-8 text-xs">
            <Link to={`/results/${attempt.id}`}>
              View Result <ArrowRight size={12} className="ml-1.5" />
            </Link>
          </Button>
        ) : (
          <Button asChild className="w-full h-8 text-xs">
            <Link to={`/tests/${test.id}`}>
              Start Test <ArrowRight size={12} className="ml-1.5" />
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

// ── Breadcrumb ────────────────────────────────────────────────────
function Breadcrumb({ steps, onBack }) {
  return (
    <div className="flex items-center gap-2 text-sm mb-6">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          {i < steps.length - 1 ? (
            <button onClick={() => onBack(i)} className="text-sky-400 hover:text-sky-300 transition-colors">{s}</button>
          ) : (
            <span className="font-semibold" style={{ color: 'var(--text)' }}>{s}</span>
          )}
          {i < steps.length - 1 && <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />}
        </div>
      ))}
    </div>
  )
}

// ── Nav Card ──────────────────────────────────────────────────────
function NavCard({ label, count, onClick, icon }) {
  return (
    <Card className="hover:border-primary/50 transition-all group w-full cursor-pointer border-border" onClick={onClick}>
      <CardContent className="p-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-foreground">{label}</p>
          {count !== undefined && (
            <p className="text-xs mt-1 text-muted-foreground">{count} test{count !== 1 ? 's' : ''}</p>
          )}
        </div>
        <ChevronRight size={18} className="text-primary group-hover:translate-x-1 transition-transform flex-shrink-0" />
      </CardContent>
    </Card>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function TestsPage() {
  const { data: testsData, isLoading: testsLoading } = useSWR('/tests/', fetcher)
  const { data: historyData, isLoading: historyLoading } = useSWR('/tests/my/history', fetcher)
  
  const loading = testsLoading || historyLoading
  const tests = testsData || []

  const history = useMemo(() => {
    if (!historyData) return {}
    const map = {}
    historyData.forEach(a => { if (!map[a.test_id] || a.status === 'submitted') map[a.test_id] = a })
    return map
  }, [historyData])

  // Navigation state: array of {type, value} steps
  // Examples:
  // [] = root
  // [{type:'category', value:'weekly_quiz'}] = weekly quiz subjects
  // [{type:'category', value:'weekly_quiz'}, {type:'subject', value:'Algorithms'}] = tests
  // [{type:'category', value:'test_series'}] = series names
  // [{type:'category', value:'test_series'}, {type:'series', value:'made_easy'}] = test types
  // [{type:'category', value:'test_series'}, {type:'series', value:'made_easy'}, {type:'type', value:'subject_wise'}] = tests
  // [{type:'category', value:'test_series'}, {type:'series', value:'made_easy'}, {type:'type', value:'topic_wise'}] = subjects
  // [{...topic_wise}, {type:'subject', value:'Algorithms'}] = tests
  const [nav, setNav] = useState([])

  const push = (type, value) => setNav(n => [...n, { type, value }])
  const goBack = (idx) => setNav(n => n.slice(0, idx))

  // Get current filtered tests based on nav
  const filteredTests = useMemo(() => {
    let filtered = tests
    nav.forEach(step => {
      if (step.type === 'category') filtered = filtered.filter(t => t.category === step.value)
      if (step.type === 'series')   filtered = filtered.filter(t => t.series_name === step.value)
      if (step.type === 'type')     filtered = filtered.filter(t => t.test_type === step.value)
      if (step.type === 'subject')  filtered = filtered.filter(t => t.subject === step.value)
    })
    return filtered
  }, [tests, nav])

  // Build breadcrumb labels
  const breadcrumbs = useMemo(() => ['Tests', ...nav.map(s => {
    if (s.type === 'category') return s.value === 'weekly_quiz' ? 'Weekly Quiz' : 'Test Series'
    if (s.type === 'series')   return SERIES_LABELS[s.value] || s.value
    if (s.type === 'type')     return TYPE_LABELS[s.value] || s.value
    if (s.type === 'subject')  return s.value
    return s.value
  })], [nav])

  if (loading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto animate-fade-in">
          {nav.length === 0 ? (
            <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text)' }}>Tests</h1>
          ) : (
            <Breadcrumb steps={breadcrumbs} onBack={goBack} />
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <TestCardSkeleton />
            <TestCardSkeleton />
            <TestCardSkeleton />
            <TestCardSkeleton />
          </div>
        </div>
      </Layout>
    )
  }

  const currentNav = nav[nav.length - 1]

  // ── Root: pick category ───────────────────────────────────────
  if (nav.length === 0) {
    const wqCount = tests.filter(t => t.category === 'weekly_quiz').length
    const tsCount = tests.filter(t => t.category === 'test_series').length
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Tests</h1>
          <div className="grid gap-4">
            <NavCard label="Weekly Quiz" count={wqCount} onClick={() => push('category', 'weekly_quiz')} />
            <NavCard label="Test Series" count={tsCount} onClick={() => push('category', 'test_series')} />
          </div>
        </div>
      </Layout>
    )
  }

  // ── Weekly Quiz → show subjects ───────────────────────────────
  if (nav.length === 1 && nav[0].value === 'weekly_quiz') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto animate-fade-in">
          <Breadcrumb steps={breadcrumbs} onBack={goBack} />
          <div className="grid gap-3">
            {SUBJECTS.map(sub => {
              const count = tests.filter(t => t.category === 'weekly_quiz' && t.subject === sub).length
              if (count === 0) return null
              return <NavCard key={sub} label={sub} count={count} onClick={() => push('subject', sub)} />
            })}
            {/* Show uncategorized weekly quizzes too */}
            {tests.filter(t => t.category === 'weekly_quiz' && !t.subject).length > 0 && (
              <NavCard label="General" count={tests.filter(t => t.category === 'weekly_quiz' && !t.subject).length}
                onClick={() => push('subject', '')} />
            )}
          </div>
        </div>
      </Layout>
    )
  }

  // ── Test Series → show Made Easy / GO Classes ─────────────────
  if (nav.length === 1 && nav[0].value === 'test_series') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto animate-fade-in">
          <Breadcrumb steps={breadcrumbs} onBack={goBack} />
          <div className="grid gap-4">
            {['made_easy', 'go_classes'].map(sn => {
              const count = tests.filter(t => t.category === 'test_series' && t.series_name === sn).length
              if (count === 0) return null
              return (
                <NavCard key={sn} label={SERIES_LABELS[sn]} count={count}
                  onClick={() => push('series', sn)} />
              )
            })}
          </div>
        </div>
      </Layout>
    )
  }

  // ── Inside a series → show Subject Wise / Topic Wise / Full Length ──
  if (nav.length === 2 && nav[0].value === 'test_series') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto animate-fade-in">
          <Breadcrumb steps={breadcrumbs} onBack={goBack} />
          <div className="grid gap-4">
            {['subject_wise', 'topic_wise', 'full_length'].map(tt => {
              const count = tests.filter(t =>
                t.category === 'test_series' &&
                t.series_name === nav[1].value &&
                t.test_type === tt
              ).length
              if (count === 0) return null
              return (
                <NavCard key={tt} label={TYPE_LABELS[tt]} count={count}
                  onClick={() => push('type', tt)} />
              )
            })}
          </div>
        </div>
      </Layout>
    )
  }

  // ── Topic Wise → show subjects ────────────────────────────────
  if (currentNav?.type === 'type' && currentNav?.value === 'topic_wise') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto animate-fade-in">
          <Breadcrumb steps={breadcrumbs} onBack={goBack} />
          <div className="grid gap-3">
            {SUBJECTS.map(sub => {
              const count = filteredTests.filter(t => t.subject === sub).length
              if (count === 0) return null
              return <NavCard key={sub} label={sub} count={count} onClick={() => push('subject', sub)} />
            })}
          </div>
        </div>
      </Layout>
    )
  }

  // ── Show tests (final level) ──────────────────────────────────
  return (
    <Layout>
      <div className="max-w-3xl mx-auto animate-fade-in">
        <Breadcrumb steps={breadcrumbs} onBack={goBack} />
        {filteredTests.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center flex flex-col items-center">
              <BookOpen size={36} className="text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No tests here yet. Check back later.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredTests.map(t => (
              <TestCard key={t.id} test={t} attempt={history[t.id]} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
