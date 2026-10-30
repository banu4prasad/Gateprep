import api from './client'
import type { AxiosResponse } from 'axios'
import type {
  AdminRequest,
  AdminResponse,
  AnswerSubmit,
  ApiResponse,
  AuthRequest,
  AuthResponse,
  BookmarkRequest,
  BookmarkResponse,
  HistoryItem,
  LeaderboardResponse,
  MyAttempt,
  PersistedResult,
  SaveAnswersResponse,
  SeriesRequest,
  SeriesResponse,
  SubmitResult,
  TestCatalogItem,
  TestDetail,
  TestQuestion,
  AttemptStart,
  ViolationUpdateRequest,
  ViolationUpdateResponse,
} from '../types/api'

export const fetcher = <T = unknown>(url: string): Promise<T> => api.get<T>(url).then(res => res.data)

// ── Auth ──────────────────────────────────────────────────────────
export const authAPI = {
  register: (data: AuthRequest): Promise<ApiResponse<AuthResponse>> => api.post('/auth/register', data),
  login:    (data: AuthRequest): Promise<ApiResponse<AuthResponse>> => api.post('/auth/login', data),
  resetPassword: (data: AuthRequest): Promise<ApiResponse<AuthResponse>> => api.post('/auth/reset-password', data),
  logout:   (): Promise<ApiResponse<AuthResponse>>     => api.post('/auth/logout'),
  me:       (): Promise<ApiResponse<AuthResponse>>     => api.get('/auth/me'),
}

// ── Admin ─────────────────────────────────────────────────────────
export const adminAPI = {
  getUsers:         (): Promise<ApiResponse<AdminResponse>>              => api.get('/admin/users'),
  updateRole:       (id: number, role: string): Promise<ApiResponse<AdminResponse>>      => api.patch(`/admin/users/${id}/role`, { role }),
  toggleStatus:     (id: number): Promise<ApiResponse<AdminResponse>>            => api.patch(`/admin/users/${id}/status`),
  createPasswordReset: (id: number): Promise<ApiResponse<AdminResponse>>         => api.post(`/admin/users/${id}/password-reset`),
  getTests:         (): Promise<ApiResponse<AdminResponse>>          => api.get('/admin/tests'),
  getTest:           (id: number): Promise<ApiResponse<AdminResponse>>           => api.get(`/admin/tests/${id}`),
  createTest:       (data: AdminRequest): Promise<ApiResponse<AdminResponse>>          => api.post('/admin/tests', data),
  deleteTest:        (id: number): Promise<ApiResponse<AdminResponse>>        => api.delete(`/admin/tests/${id}`),
  updateTest:       (id: number, data: AdminRequest): Promise<ApiResponse<AdminResponse>>       => api.patch(`/admin/tests/${id}`, data),
  getQuestions:     (testId: number): Promise<ApiResponse<AdminResponse>>       => api.get(`/admin/tests/${testId}/questions`),
  addQuestions:     (testId: number, qs: unknown): Promise<ApiResponse<AdminResponse>>    => api.post(`/admin/tests/${testId}/questions`, { questions: qs }),
  updateQuestion:   (testId: number, qId: number, data: AdminRequest): Promise<ApiResponse<AdminResponse>> => api.patch(`/admin/tests/${testId}/questions/${qId}`, data),
  uploadQuestionsFile: (testId: number, form: FormData): Promise<ApiResponse<AdminResponse>> => api.post(`/admin/tests/${testId}/questions/upload-file`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteQuestion:   (testId: number, qId: number): Promise<ApiResponse<AdminResponse>>   => api.delete(`/admin/tests/${testId}/questions/${qId}`),
  uploadQImage:     (qId: number, form: FormData, target = 'question'): Promise<ApiResponse<AdminResponse>> => api.post(`/admin/questions/${qId}/image?target=${encodeURIComponent(target)}`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteQImage:     (qId: number, target: string): Promise<ApiResponse<AdminResponse>>   => api.delete(`/admin/questions/${qId}/image?target=${encodeURIComponent(target)}`),
}

// ── Tests ─────────────────────────────────────────────────────────
export const testAPI = {
  getTests:           (): Promise<ApiResponse<TestCatalogItem[]>>                        => api.get('/tests'),
  getTest:            (id: number): Promise<ApiResponse<TestDetail>>                      => api.get(`/tests/${id}`),
  startTest:          (id: number): Promise<ApiResponse<AttemptStart>>                      => api.post(`/tests/${id}/start`),
  getQuestions:       (testId: number, attemptId: number): Promise<ApiResponse<TestQuestion[]>>       => api.get(`/tests/${testId}/attempt/${attemptId}/questions`),
  saveAnswers:        (testId: number, attemptId: number, ans: AnswerSubmit[]): Promise<ApiResponse<SaveAnswersResponse>>  => api.post(`/tests/${testId}/attempt/${attemptId}/save`, { answers: ans }),
  submitTest:         (testId: number, attemptId: number, ans: AnswerSubmit[]): Promise<ApiResponse<SubmitResult>>  => api.post(`/tests/${testId}/attempt/${attemptId}/submit`, { answers: ans }),
  updateViolations:   (testId: number, attemptId: number, data: ViolationUpdateRequest): Promise<ApiResponse<ViolationUpdateResponse>> => api.patch(`/tests/${testId}/attempt/${attemptId}/violations`, data),
  getResult:          (attemptId: number): Promise<ApiResponse<PersistedResult>>               => api.get(`/tests/attempt/${attemptId}/result`),
  downloadResultHtml: (attemptId: number): Promise<AxiosResponse<Blob>>               => api.get(`/tests/attempt/${attemptId}/result.html`, { responseType: 'blob' }),
  getHistory:         (): Promise<ApiResponse<HistoryItem[]>>                        => api.get('/tests/my/history'),
  getLeaderboard:     (testId: number): Promise<ApiResponse<LeaderboardResponse>>                  => api.get(`/tests/${testId}/leaderboard`),
  getMyAttempts:      (testId: number): Promise<ApiResponse<MyAttempt[]>>                  => api.get(`/tests/${testId}/my-attempts`),
}

// ── Bookmarks ─────────────────────────────────────────────────────
export const bookmarkAPI = {
  toggle:     (questionId: number, note: unknown): Promise<ApiResponse<BookmarkResponse>> => api.post(`/bookmarks/${questionId}/toggle`, { note }),
  getAll:     (): Promise<ApiResponse<BookmarkResponse>>                 => api.get('/bookmarks'),
  getIds:     (): Promise<ApiResponse<BookmarkResponse>>                 => api.get('/bookmarks/ids'),
  updateNote: (questionId: number, note: unknown): Promise<ApiResponse<BookmarkResponse>> => api.patch(`/bookmarks/${questionId}/note`, { note }),
}

// ── Series ────────────────────────────────────────────────────────
export const seriesAPI = {
  getAll:   (): Promise<ApiResponse<SeriesResponse>>     => api.get('/series'),
  getTests: (id: number): Promise<ApiResponse<SeriesResponse>>   => api.get(`/series/${id}/tests`),
  create:   (data: SeriesRequest): Promise<ApiResponse<SeriesResponse>> => api.post('/series', data),
  delete:   (id: number): Promise<ApiResponse<SeriesResponse>>   => api.delete(`/series/${id}`),
}
