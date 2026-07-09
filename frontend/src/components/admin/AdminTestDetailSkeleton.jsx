import { Link } from 'react-router-dom'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left'
import Layout from '../shared/Layout'
import { SkeletonBlock } from '../shared/Skeletons'

export default function AdminTestDetailSkeleton() {
  return (
    <Layout>
      <div className="space-y-6 animate-fade-in max-w-3xl">
        <Link to="/admin/tests" className="flex items-center gap-1.5 theme-muted hover:opacity-80 text-sm mb-4 w-fit">
          <ArrowLeft size={15}/> Back to Tests
        </Link>
        <div className="gate-card p-5">
          <SkeletonBlock className="h-6 w-3/4 mb-2" />
          <SkeletonBlock className="h-4 w-1/2 mb-4" />
          <div className="flex gap-4">
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-4 w-24" />
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="gate-card p-4">
              <SkeletonBlock className="h-4 w-full mb-2" />
              <SkeletonBlock className="h-4 w-5/6 mb-4" />
              <div className="space-y-2">
                <SkeletonBlock className="h-8 w-full rounded" />
                <SkeletonBlock className="h-8 w-full rounded" />
                <SkeletonBlock className="h-8 w-full rounded" />
                <SkeletonBlock className="h-8 w-full rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
