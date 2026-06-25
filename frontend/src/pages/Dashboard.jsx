import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import { useAuth } from '../context/AuthContext'
import useSWR from 'swr'
import { fetcher } from '../api/api'
import BookOpen from 'lucide-react/dist/esm/icons/book-open'
import Clock from 'lucide-react/dist/esm/icons/clock'
import Target from 'lucide-react/dist/esm/icons/target'
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import clsx from 'clsx'
import { SkeletonBlock, TestCardSkeleton } from '../components/shared/Skeletons'

export default function Dashboard() {
  const { user } = useAuth()
  
  const { data: tests = [], isLoading: testsLoading } = useSWR('/tests', fetcher)
  const { data: history = [], isLoading: historyLoading } = useSWR('/tests/my/history', fetcher)
  const isInitialDataLoading = testsLoading || historyLoading

  const { submitted, completedCount, attemptMap } = useMemo(() => {
    const submitted = history.filter(h => h.status === 'submitted')
    const completedCount = new Set(submitted.map(h => h.test_id)).size
    const attemptMap = Object.fromEntries(history.map(h => [h.test_id, h]))
    return { submitted, completedCount, attemptMap }
  }, [history])

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Hello, {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Ready to practice? Pick a test below.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Tests Available', value: tests.length, isLoading: testsLoading, icon: BookOpen, color: 'text-sky-400', bg: 'bg-sky-500/10' },
            { label: 'Completed', value: completedCount, isLoading: historyLoading, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
          ].map(({ label, value, isLoading, icon: Icon, color, bg }) => (
            <div key={label} className="gate-card p-5 flex flex-col gap-2">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={18} className={color} />
              </div>
              {isLoading ? (
                <SkeletonBlock className="mt-1 h-8 w-14" />
              ) : (
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
              )}
              <p className="text-slate-500 dark:text-slate-400 text-sm">{label}</p>
            </div>
          ))}
        </div>

        {/* Tests */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Available Tests</h2>
          {isInitialDataLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Loading available tests">
              <TestCardSkeleton />
              <TestCardSkeleton />
              <TestCardSkeleton />
            </div>
          ) : tests.length === 0 ? (
            <div className="gate-card p-10 text-center">
              <BookOpen size={36} className="text-slate-700 mx-auto mb-3"/>
              <p className="text-slate-500 dark:text-slate-400">No tests available yet. Check back later.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tests.map(t => {
                const attempt = attemptMap[t.id]
                const done = attempt?.status === 'submitted'
                const pct = done && attempt?.total_marks ? Math.round(attempt.score / attempt.total_marks * 100) : null
                return (
                  <div key={t.id} className="gate-card p-5 flex flex-col gap-3 hover:border-brand-500/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white leading-snug">{t.title}</h3>
                      {done && <span className="badge badge-green flex-shrink-0">Done</span>}
                    </div>
                    {t.description && <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">{t.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5"><Clock size={12}/>{t.duration_minutes} min</span>
                      <span className="flex items-center gap-1.5"><BookOpen size={12}/>{t.question_count} questions</span>
                      <span className="flex items-center gap-1.5"><Target size={12}/>{t.total_marks} marks</span>
                    </div>
                    {pct !== null && (
                      <div className={clsx('px-3 py-2 rounded-lg border text-xs',
                        pct >= 75 ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' :
                        pct >= 50 ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                      )}>
                        Score: {attempt.score?.toFixed(1)} / {attempt.total_marks} ({pct}%)
                      </div>
                    )}
                    <div className="flex gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                      {done ? (
                        <Link to={`/results/${attempt.id}`} className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-xl font-medium border border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/5 hover:bg-sky-500/10 transition-colors">
                          View Result <ArrowRight size={13}/>
                        </Link>
                      ) : (
                        <Link to={`/tests/${t.id}`} className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-xl font-medium btn-primary">
                          Start Test <ArrowRight size={13}/>
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
