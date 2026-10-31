import api from './client'
import type { AxiosResponse } from 'axios'
import type {
  AdminResponse,
  AnswerSubmit,
  ApiResponse,
  AuthUserResponse,
  MeResponse,
  MessageResponse,
  BookmarkResponse,
  HistoryItem,
  LeaderboardResponse,
  MyAttempt,
  PersistedResult,
  SaveAnswersResponse,
  SeriesResponse,
  SubmitResult,
  BookmarkNote,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  RoleUpdate,
  TestCreate,
  TestPatch,
  QuestionIn,
  QuestionsBulk,
  SeriesCreate,
  ViolationUpdate,
  TestCatalogItem,
  TestDetail,
  TestQuestion,
  AttemptStart,
  ViolationUpdateResponse,
} from '../types/api'

export const fetcher = <T = unknown>(url: string): Promise<T> => api.get<T>(url).then(res => res.data)

// ── Auth ──────────────────────────────────────────────────────────
export const authAPI = {
  register: (data: RegisterRequest): Promise<ApiResponse<AuthUserResponse>> => api.post('/auth/register', data),
  login:    (data: LoginRequest): Promise<ApiResponse<AuthUserResponse>> => api.post('/auth/login', data),
  resetPassword: (data: ResetPasswordRequest): Promise<ApiResponse<MessageResponse>> => api.post('/auth/reset-password', data),
  logout:   (): Promise<ApiResponse<MessageResponse>>     => api.post('/auth/logout'),
  me:       (): Promise<ApiResponse<MeResponse>>     => api.get('/auth/me'),
}

// ── Admin ─────────────────────────────────────────────────────────
export const adminAPI = {
  getUsers:         (): Promise<ApiResponse<AdminResponse>>              => api.get('/admin/users'),
  updateRole:       (id: string | number, role: RoleUpdate['role']): Promise<ApiResponse<AdminResponse>>      => api.patch(`/admin/users/${id}/role`, { role }),
  toggleStatus:     (id: string | number): Promise<ApiResponse<AdminResponse>>            => api.patch(`/admin/users/${id}/status`),
  createPasswordReset: (id: string | number): Promise<ApiResponse<AdminResponse>>         => api.post(`/admin/users/${id}/password-reset`),
  getTests:         (): Promise<ApiResponse<AdminResponse>>          => api.get('/admin/tests'),
  getTest:           (id: string | number): Promise<ApiResponse<AdminResponse>>           => api.get(`/admin/tests/${id}`),
  createTest:       (data: TestCreate): Promise<ApiResponse<AdminResponse>>          => api.post('/admin/tests', data),
  deleteTest:        (id: string | number): Promise<ApiResponse<AdminResponse>>        => api.delete(`/admin/tests/${id}`),
  updateTest:       (id: string | number, data: TestPatch): Promise<ApiResponse<AdminResponse>>       => api.patch(`/admin/tests/${id}`, data),
  getQuestions:     (testId: string | number): Promise<ApiResponse<AdminResponse>>       => api.get(`/admin/tests/${testId}/questions`),
  addQuestions:     (testId: string | number, qs: QuestionsBulk['questions']): Promise<ApiResponse<AdminResponse>>    => api.post(`/admin/tests/${testId}/questions`, { questions: qs }),
  updateQuestion:   (testId: string | number, qId: string | number, data: QuestionIn): Promise<ApiResponse<AdminResponse>> => api.patch(`/admin/tests/${testId}/questions/${qId}`, data),
  uploadQuestionsFile: (testId: string | number, form: FormData): Promise<ApiResponse<AdminResponse>> => api.post(`/admin/tests/${testId}/questions/upload-file`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteQuestion:   (testId: string | number, qId: string | number): Promise<ApiResponse<AdminResponse>>   => api.delete(`/admin/tests/${testId}/questions/${qId}`),
  uploadQImage:     (qId: string | number, form: FormData, target: 'question' | 'A' | 'B' | 'C' | 'D' = 'question'): Promise<ApiResponse<AdminResponse>> => api.post(`/admin/questions/${qId}/image?target=${encodeURIComponent(target)}`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteQImage:     (qId: string | number, target: 'question' | 'A' | 'B' | 'C' | 'D'): Promise<ApiResponse<AdminResponse>>   => api.delete(`/admin/questions/${qId}/image?target=${encodeURIComponent(target)}`),
}

// ── Tests ─────────────────────────────────────────────────────────
export const testAPI = {
  getTests:           (): Promise<ApiResponse<TestCatalogItem[]>>                        => api.get('/tests'),
  getTest:            (id: string | number): Promise<ApiResponse<TestDetail>>                      => api.get(`/tests/${id}`),
  startTest:          (id: string | number): Promise<ApiResponse<AttemptStart>>                      => api.post(`/tests/${id}/start`),
  getQuestions:       (testId: string | number, attemptId: string | number): Promise<ApiResponse<TestQuestion[]>>       => api.get(`/tests/${testId}/attempt/${attemptId}/questions`),
  saveAnswers:        (testId: string | number, attemptId: string | number, ans: AnswerSubmit[]): Promise<ApiResponse<SaveAnswersResponse>>  => api.post(`/tests/${testId}/attempt/${attemptId}/save`, { answers: ans }),
  submitTest:         (testId: string | number, attemptId: string | number, ans: AnswerSubmit[]): Promise<ApiResponse<SubmitResult>>  => api.post(`/tests/${testId}/attempt/${attemptId}/submit`, { answers: ans }),
  updateViolations:   (testId: string | number, attemptId: string | number, data: ViolationUpdate): Promise<ApiResponse<ViolationUpdateResponse>> => api.patch(`/tests/${testId}/attempt/${attemptId}/violations`, data),
  getResult:          (attemptId: string | number): Promise<ApiResponse<PersistedResult>>               => api.get(`/tests/attempt/${attemptId}/result`),
  downloadResultHtml: (attemptId: string | number): Promise<AxiosResponse<Blob>>               => api.get(`/tests/attempt/${attemptId}/result.html`, { responseType: 'blob' }),
  getHistory:         (): Promise<ApiResponse<HistoryItem[]>>                        => api.get('/tests/my/history'),
  getLeaderboard:     (testId: string | number): Promise<ApiResponse<LeaderboardResponse>>                  => api.get(`/tests/${testId}/leaderboard`),
  getMyAttempts:      (testId: string | number): Promise<ApiResponse<MyAttempt[]>>                  => api.get(`/tests/${testId}/my-attempts`),
}

// ── Bookmarks ─────────────────────────────────────────────────────
export const bookmarkAPI = {
  toggle:     (questionId: string | number, note: BookmarkNote['note']): Promise<ApiResponse<BookmarkResponse>> => api.post(`/bookmarks/${questionId}/toggle`, { note }),
  getAll:     (): Promise<ApiResponse<BookmarkResponse>>                 => api.get('/bookmarks'),
  getIds:     (): Promise<ApiResponse<BookmarkResponse>>                 => api.get('/bookmarks/ids'),
  updateNote: (questionId: string | number, note: BookmarkNote['note']): Promise<ApiResponse<BookmarkResponse>> => api.patch(`/bookmarks/${questionId}/note`, { note }),
}

// ── Series ────────────────────────────────────────────────────────
export const seriesAPI = {
  getAll:   (): Promise<ApiResponse<SeriesResponse>>     => api.get('/series'),
  getTests: (id: string | number): Promise<ApiResponse<SeriesResponse>>   => api.get(`/series/${id}/tests`),
  create:   (data: SeriesCreate): Promise<ApiResponse<SeriesResponse>> => api.post('/series', data),
  delete:   (id: string | number): Promise<ApiResponse<SeriesResponse>>   => api.delete(`/series/${id}`),
}
