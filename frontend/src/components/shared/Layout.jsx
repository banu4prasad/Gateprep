import Navbar from './Navbar'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <main className="pt-14 pb-20 sm:pb-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
