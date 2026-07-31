import { useParams, Link } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import { fetcher } from '../api/api'
import useSWR from 'swr'
import Trophy from 'lucide-react/dist/esm/icons/trophy'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left'
import Medal from 'lucide-react/dist/esm/icons/medal'
import Crown from 'lucide-react/dist/esm/icons/crown'
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw'
import Spinner from '../components/shared/Spinner'
import clsx from 'clsx'
import { LeaderboardSkeleton } from '../components/shared/Skeletons'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'

const MEDAL_COLORS = {
  1: { bg: 'bg-amber-500/20 border-amber-500/40', text: 'text-amber-400', icon: <Crown size={16} className="text-amber-400"/> },
  2: { bg: 'bg-slate-400/10 border-slate-400/30', text: 'text-slate-600 dark:text-slate-300', icon: <Medal size={16} className="text-slate-500 dark:text-slate-400"/> },
  3: { bg: 'bg-orange-600/10 border-orange-600/30', text: 'text-orange-400', icon: <Medal size={16} className="text-orange-500"/> },
}

export default function LeaderboardPage() {
  const { testId } = useParams()
  const { data, isLoading: loading } = useSWR(`/tests/${testId}/leaderboard`, fetcher)

  if (loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto flex flex-col gap-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <Link to="/tests" className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:text-slate-300 text-sm">
              <ArrowLeft size={15}/> Back to Tests
            </Link>
          </div>
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse" />
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mx-auto mb-2" />
            <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mx-auto" />
          </div>
          <LeaderboardSkeleton />
        </div>
      </Layout>
    )
  }
  if (!data) return <Layout><p className="text-slate-500 dark:text-slate-400 text-center py-16">Leaderboard not found.</p></Layout>

  const top3 = data.leaderboard.slice(0, 3)

  return (
    <Layout>
      <div className="max-w-2xl mx-auto flex flex-col gap-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <Link to="/tests" className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:text-slate-300 text-sm">
            <ArrowLeft size={15}/> Back to Tests
          </Link>
          <Link to={`/tests/${testId}`} className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 text-sm">
            <RotateCcw size={13}/> Take Test
          </Link>
        </div>

        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Trophy size={26} className="text-amber-400"/>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{data.test_title}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{data.total_participants} participant{data.total_participants !== 1 ? 's' : ''} · First attempt only</p>
          {data.current_user_rank && (
            <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full bg-sky-500/10 border border-brand-500/20">
              <span className="text-sky-400 text-sm font-medium">Your rank: #{data.current_user_rank}</span>
            </div>
          )}
        </div>

        {data.leaderboard.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-slate-500 dark:text-slate-400">No submissions yet. Be the first!</p>
              <Button asChild className="mt-4 inline-flex items-center gap-2 text-sm">
                <Link to={`/tests/${testId}`}>
                  Take Test
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Top 3 podium */}
            {top3.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {/* Reorder: 2nd, 1st, 3rd for podium effect */}
                {[top3[1], top3[0], top3[2]].map((entry, podiumIdx) => {
                  if (!entry) return <div key={`podium-empty-${podiumIdx}`}/>
                  const actualRank = entry.rank
                  const m = MEDAL_COLORS[actualRank] || {}
                  const heights = ['h-24 sm:h-28', 'h-28 sm:h-36', 'h-20 sm:h-24']
                  return (
                    <Card key={`podium-${podiumIdx}-user-${entry.user_id}`} className={clsx(
                      'border p-2.5 sm:p-4 flex flex-col items-center justify-end text-center',
                      m.bg, heights[podiumIdx],
                      entry.is_current_user && 'ring-2 ring-brand-500/50'
                    )}>
                      <div className="mb-1">{m.icon}</div>
                      <p className={`font-bold text-sm ${m.text} truncate w-full`}>
                        {entry.full_name.split(' ')[0]}
                        {entry.is_current_user && ' (You)'}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">{entry.percentage}%</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">{entry.score}/{entry.total_marks}</p>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Full table */}
            <Card className="overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200 dark:border-slate-800 hover:bg-transparent">
                    <TableHead className="text-left px-3 sm:px-5 py-3 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider w-12">Rank</TableHead>
                    <TableHead className="text-left px-3 sm:px-5 py-3 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">Name</TableHead>
                    <TableHead className="text-right px-3 sm:px-5 py-3 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">Score</TableHead>
                    <TableHead className="text-right px-3 sm:px-5 py-3 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">%</TableHead>
                    <TableHead className="text-right px-3 sm:px-5 py-3 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-800/60">
                  {data.leaderboard.map(entry => {
                    const m = MEDAL_COLORS[entry.rank]
                    return (
                      <TableRow key={`leaderboard-rank-${entry.rank}-user-${entry.user_id}`} className={clsx(
                        'transition-colors',
                        entry.is_current_user ? 'bg-sky-500/5' : 'hover:bg-slate-100 dark:bg-slate-800/30'
                      )} style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 53px' }}>
                        <TableCell className="px-3 sm:px-5 py-3.5">
                          <div className="flex items-center justify-center w-7 h-7">
                            {m ? m.icon : <span className="text-slate-500 dark:text-slate-400 font-mono text-sm">#{entry.rank}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 sm:px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{entry.full_name[0]?.toUpperCase()}</span>
                            </div>
                            <span className={clsx('font-medium', entry.is_current_user ? 'text-sky-300' : 'text-slate-700 dark:text-slate-200')}>
                              {entry.full_name}
                              {entry.is_current_user && <span className="text-sky-400 text-xs ml-1">(You)</span>}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 sm:px-5 py-3.5 text-right font-mono text-slate-600 dark:text-slate-300">
                          {entry.score}/{entry.total_marks}
                        </TableCell>
                        <TableCell className="px-3 sm:px-5 py-3.5 text-right">
                          <span className={clsx('font-semibold', entry.percentage >= 75 ? 'text-green-400' : entry.percentage >= 50 ? 'text-amber-400' : 'text-red-400')}>
                            {entry.percentage}%
                          </span>
                        </TableCell>
                        <TableCell className="px-3 sm:px-5 py-3.5 text-right text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell">
                          {entry.submitted_at ? new Date(entry.submitted_at).toLocaleDateString('en-IN') : '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>

            <p className="text-center text-slate-600 text-xs">
              Only first attempts count toward rankings. Reattempts are for practice only.
            </p>
          </>
        )}
      </div>
    </Layout>
  )
}
