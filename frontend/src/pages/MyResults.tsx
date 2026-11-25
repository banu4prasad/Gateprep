import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import useSWR from 'swr'
import { fetcher } from '../api/api'
import type { HistoryItem, TestCatalogItem } from '../types/api'
import { ClipboardList, ArrowRight } from 'lucide-react'
import Spinner from '../components/shared/Spinner'
import { ResultCardSkeleton } from '../components/shared/Skeletons'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function MyResults() {
  const { data: historyData, isLoading: historyLoading } = useSWR<HistoryItem[]>('/tests/my/history', fetcher)
  const { data: testsData, isLoading: testsLoading } = useSWR<TestCatalogItem[]>('/tests', fetcher)
  
  const loading = historyLoading || testsLoading
  const history = historyData || []
  
  const tests = useMemo<Partial<Record<number, TestCatalogItem>>>(() => {
    if (!testsData) return {}
    return Object.fromEntries(testsData.map(t => [t.id, t]))
  }, [testsData])

  if (loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto flex flex-col gap-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-foreground transition-colors duration-200">My Results</h1>
            <div className="h-4 w-24 bg-muted rounded animate-pulse mt-2" />
          </div>
          <div className="flex flex-col gap-2">
            <ResultCardSkeleton />
            <ResultCardSkeleton />
            <ResultCardSkeleton />
            <ResultCardSkeleton />
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground transition-colors duration-200">My Results</h1>
          <p className="text-sm mt-1 text-muted-foreground transition-colors duration-200">
            {history.length} completed test{history.length !== 1 ? 's' : ''}
          </p>
        </div>

        {history.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-10 text-center flex flex-col items-center">
              <ClipboardList size={36} className="mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
              <p className="text-muted-foreground">No completed tests yet</p>
              <Link to="/tests" className="text-primary text-sm hover:underline mt-2 inline-block">
                Browse tests →
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map(a => {
              const t   = tests[a.test_id]
              // @ts-expect-error TODO(null-safety): score may be null before submit; Math.round(null / total_marks * 100) is 0.
              const pct = a.total_marks ? Math.round(a.score / a.total_marks * 100) : 0
              const color = pct >= 75 ? 'text-success-text' : pct >= 50 ? 'text-warning-text' : 'text-destructive'
              const bg    = pct >= 75 ? 'color-mix(in srgb, var(--success-text) 10%, transparent)' : pct >= 50 ? 'color-mix(in srgb, var(--warning-text) 10%, transparent)' : 'color-mix(in srgb, var(--danger-text) 10%, transparent)'
              return (
                <Card key={a.id} className="border-border">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                         style={{ background: bg }}>
                      <span className={`font-bold text-sm ${color}`}>{pct}%</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-card-foreground transition-colors duration-200">
                        {t?.title || `Test #${a.test_id}`}
                      </p>
                      <p className="text-xs mt-0.5 text-muted-foreground transition-colors duration-200">
                        Score: {a.score?.toFixed(1)} / {a.total_marks} ·{' '}
                        {
                          // @ts-expect-error TODO(null-safety): submitted_at may be null; Date(null) displays the epoch date as before.
                          new Date(a.submitted_at).toLocaleDateString('en-IN')
                        }
                      </p>
                    </div>
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/results/${a.id}`}
                        className="text-sm flex items-center gap-1.5 flex-shrink-0">
                        View <ArrowRight size={13} />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
