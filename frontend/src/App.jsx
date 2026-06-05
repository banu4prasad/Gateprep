import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ProtectedRoute, GuestRoute } from './components/shared/ProtectedRoute'
import Spinner from './components/shared/Spinner'

const LoginPage        = lazy(() => import('./pages/Login'))
const RegisterPage     = lazy(() => import('./pages/Register'))
const ForgotPassword   = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword    = lazy(() => import('./pages/ResetPassword'))
const PendingPage      = lazy(() => import('./pages/Pending'))

const AdminDashboard   = lazy(() => import('./pages/AdminDashboard'))
const AdminUsers       = lazy(() => import('./pages/AdminUsers'))
const AdminTests       = lazy(() => import('./pages/AdminTests'))
const AdminTestDetail  = lazy(() => import('./pages/AdminTestDetail'))
const AdminChecklist   = lazy(() => import('./pages/AdminChecklist'))

const Dashboard        = lazy(() => import('./pages/Dashboard'))
const TestsPage        = lazy(() => import('./pages/Tests'))
const TestEngine       = lazy(() => import('./pages/TestEngine'))
const Result           = lazy(() => import('./pages/Result'))
const MyResults        = lazy(() => import('./pages/MyResults'))
const Leaderboard      = lazy(() => import('./pages/Leaderboard'))
const Bookmarks        = lazy(() => import('./pages/Bookmarks'))
const Checklist        = lazy(() => import('./pages/Checklist'))

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner size={36} className="text-sky-500" /></div>}>
          <Routes>
            {/* Public */}
            <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pending"  element={<PendingPage />} />

            {/* Admin */}
            <Route path="/admin"                   element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users"             element={<ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/tests"             element={<ProtectedRoute role="admin"><AdminTests /></ProtectedRoute>} />
            <Route path="/admin/tests/:testId"     element={<ProtectedRoute role="admin"><AdminTestDetail /></ProtectedRoute>} />
            <Route path="/admin/checklist"         element={<ProtectedRoute role="admin"><AdminChecklist /></ProtectedRoute>} />

            {/* Aspirant */}
            <Route path="/dashboard"               element={<ProtectedRoute role="aspirant"><Dashboard /></ProtectedRoute>} />
            <Route path="/tests"                   element={<ProtectedRoute role="aspirant"><TestsPage /></ProtectedRoute>} />
            <Route path="/tests/:testId"           element={<ProtectedRoute role="aspirant"><TestEngine /></ProtectedRoute>} />
            <Route path="/tests/:testId/leaderboard" element={<ProtectedRoute role="aspirant"><Leaderboard /></ProtectedRoute>} />
            <Route path="/results"                 element={<ProtectedRoute role="aspirant"><MyResults /></ProtectedRoute>} />
            <Route path="/results/:attemptId"      element={<ProtectedRoute><Result /></ProtectedRoute>} />
            <Route path="/bookmarks"               element={<ProtectedRoute role="aspirant"><Bookmarks /></ProtectedRoute>} />
            <Route path="/checklist"               element={<ProtectedRoute role="aspirant"><Checklist /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  )
}
