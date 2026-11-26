import { useEffect } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import App from './App'
import { GuestRoute, ProtectedRoute } from './components/shared/ProtectedRoute'
import { useAuth } from './context/AuthContext'

const mockApiGet = vi.fn()
const mockApiPost = vi.fn()

vi.mock('./api/client', () => ({
  default: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
  AUTH_UNAUTHORIZED_EVENT: 'gateprep:auth-unauthorized',
  startTokenRefresh: vi.fn(),
  stopTokenRefresh: vi.fn(),
}))

function LocationRecorder({ historyLog }: { historyLog: string[] }) {
  const location = useLocation()
  useEffect(() => {
    const full = `${location.pathname}${location.search}`
    if (historyLog[historyLog.length - 1] !== full) {
      historyLog.push(full)
    }
  }, [location.pathname, location.search, historyLog])
  return null
}

function makeDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

describe('App routing, auth guard loading, and 404 handling', () => {
  it('renders 404 Not Found with Back to Dashboard for signed-in aspirant without any /login hop', async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url === '/auth/me') {
        return Promise.resolve({
          data: { id: 1, email: 'a@example.com', role: 'aspirant', full_name: 'Ada Lovelace' },
        })
      }
      return Promise.resolve({ data: [] })
    })
    mockApiPost.mockResolvedValue({ data: {} })

    const historyLog: string[] = []
    render(
      <MemoryRouter initialEntries={['/does-not-exist']}>
        <LocationRecorder historyLog={historyLog} />
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument())
    expect(historyLog).toEqual(['/does-not-exist'])
    expect(historyLog).not.toContain('/login')
    expect(historyLog).not.toContain('/dashboard')

    const backLink = screen.getByRole('link', { name: 'Back to Dashboard' })
    expect(backLink).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('navigation', { name: 'Main Navigation' })).toBeInTheDocument()
  })

  it('points Back to Dashboard to /admin for signed-in admins on 404', async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url === '/auth/me') {
        return Promise.resolve({
          data: { id: 2, email: 'admin@example.com', role: 'admin', full_name: 'Admin User' },
        })
      }
      return Promise.resolve({ data: [] })
    })
    mockApiPost.mockResolvedValue({ data: {} })

    render(
      <MemoryRouter initialEntries={['/missing-admin-page']}>
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument())
    expect(screen.getByRole('link', { name: 'Back to Dashboard' })).toHaveAttribute('href', '/admin')
  })

  it('renders standalone 404 card without aspirant navbar for pending users', async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url === '/auth/me') {
        return Promise.resolve({
          data: { id: 3, email: 'pending@example.com', role: 'user', full_name: 'Pending User' },
        })
      }
      return Promise.resolve({ data: [] })
    })

    render(
      <MemoryRouter initialEntries={['/does-not-exist']}>
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument())
    expect(screen.queryByRole('navigation', { name: 'Main Navigation' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Approval Status' })).toHaveAttribute('href', '/pending')
  })

  it('renders public 404 with Back to Sign in and no redirect when signed out', async () => {
    mockApiGet.mockRejectedValue(new Error('Unauthorized'))

    const historyLog: string[] = []
    render(
      <MemoryRouter initialEntries={['/does-not-exist']}>
        <LocationRecorder historyLog={historyLog} />
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument())
    expect(historyLog).toEqual(['/does-not-exist'])
    expect(screen.getByRole('link', { name: 'Back to Sign in' })).toHaveAttribute('href', '/login')
  })

  it('redirects / directly to /dashboard for aspirant with at most one hop and no /login hop', async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url === '/auth/me') {
        return Promise.resolve({
          data: { id: 1, email: 'a@example.com', role: 'aspirant', full_name: 'Ada Lovelace' },
        })
      }
      return Promise.resolve({ data: [] })
    })
    mockApiPost.mockResolvedValue({ data: {} })

    const historyLog: string[] = []
    render(
      <MemoryRouter initialEntries={['/']}>
        <LocationRecorder historyLog={historyLog} />
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: /^Hello,/ })).toBeInTheDocument())
    expect(historyLog).toEqual(['/', '/dashboard'])
    expect(historyLog).not.toContain('/login')
  })

  it('redirects / directly to /login once when signed out after waiting for session loading', async () => {
    const deferred = makeDeferred<{ data: unknown }>()
    mockApiGet.mockImplementation((url: string) => {
      if (url === '/auth/me') return deferred.promise
      return Promise.resolve({ data: [] })
    })

    const historyLog: string[] = []
    render(
      <MemoryRouter initialEntries={['/']}>
        <LocationRecorder historyLog={historyLog} />
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(historyLog).toEqual(['/'])

    deferred.reject(new Error('Unauthorized'))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument())
    expect(historyLog).toEqual(['/', '/login'])
  })

  it('waits for session loading in ProtectedRoute and GuestRoute before redirecting', async () => {
    const deferred = makeDeferred<{ data: { id: number; email: string; role: string; full_name: string } }>()
    mockApiGet.mockImplementation((url: string) => {
      if (url === '/auth/me') return deferred.promise
      return Promise.resolve({ data: [] })
    })

    function Probe() {
      const location = useLocation()
      const { user, loading } = useAuth()
      return <output data-testid="probe">{`${location.pathname}:${String(loading)}:${user?.role ?? 'none'}`}</output>
    }

    const { AuthProvider } = await import('./context/AuthContext')

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute role="aspirant">
                  <div>Secret</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/guest"
              element={
                <GuestRoute>
                  <div>Guest</div>
                </GuestRoute>
              }
            />
            <Route path="/login" element={<Probe />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    // Still loading: must show PageLoader and not redirect prematurely
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByTestId('probe')).not.toBeInTheDocument()

    deferred.reject(new Error('Unauthorized'))
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('/login:false:none'))
  })
})
