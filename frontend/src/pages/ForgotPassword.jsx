import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded bg-sky-600 flex items-center justify-center">
            <span className="font-bold text-white">G</span>
          </div>
          <span className="font-bold text-lg" style={{ color: 'var(--text)' }}>GATEPrep</span>
        </div>

        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Account recovery</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          Contact your administrator to receive a secure reset link.
        </p>

        <div className="gate-card p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded bg-sky-500/15 border border-sky-500/25 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={18} className="text-sky-400" />
            </div>
            <div>
              <h3 className="font-semibold text-base" style={{ color: 'var(--text)' }}>Admin-assisted reset</h3>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                An administrator can generate a one-time link from the Users page.
              </p>
            </div>
          </div>

          <Link to="/login" className="btn-ghost w-full mt-6 flex items-center justify-center gap-2">
            <ArrowLeft size={15} /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
