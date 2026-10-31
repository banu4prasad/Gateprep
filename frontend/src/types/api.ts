import type { AxiosResponse } from 'axios'
import type { components } from '../api/schema'

export type ApiResponse<T> = AxiosResponse<T>
export type ApiJson = Record<string, unknown>
export type ApiId = number

export type TestStatus = 'in_progress' | 'submitted'

// TODO(response_model): response shape for GET /tests.
export interface TestCatalogItem {
  id: number
  title: string
  description: string | null
  duration_minutes: number
  total_marks: number
  question_count: number
  series_id: number | null
  created_at: string
  category: string | null
  series_name: string | null
  test_type: string | null
  subject: string | null
}

export interface TestDetail {
  id: number
  title: string
  description: string | null
  duration_minutes: number
  total_marks: number
  question_count: number
  series_id: number | null
  created_at: string
}

// TODO(response_model): fields consumed by admin user management.
export interface AdminUser {
  id: number
  email: string
  full_name: string
  role: string
  is_active: boolean
}

export interface AdminUsersResponse {
  items: AdminUser[]
  total: number
  pending_count: number
  aspirants_count: number
  has_more: boolean
  next_cursor: string | null
}

// TODO(response_model): fields consumed by admin password reset.
export interface PasswordResetResponse {
  reset_url: string
}

// TODO(response_model): response shape for GET /bookmarks/ids.
export interface BookmarkIdsResponse { ids: number[] }
// TODO(response_model): response shape for POST /bookmarks/{id}/toggle.
export interface BookmarkToggleResponse { bookmarked: boolean }

// TODO(response_model): option_images typed as string|null per app write paths (admin/questions.py upload/delete/NAT clear); backend BookmarkOut types it as Optional[dict]; replace with generated BookmarkOut once backend types option_images.
export interface BookmarkItem {
  correct_answer?: string | null
  created_at: string
  id: number
  marks: number
  note: string | null
  option_images?: Record<string, string | null> | null
  options: string[]
  question_id: number
  question_image_url?: string | null
  question_text: string
  question_type: string
  subject: string | null
  test_id: number
  test_title: string
  topic: string | null
}

// TODO(response_model): fields consumed by admin test editing.
export interface AdminTestQuestion extends TestQuestion {
  question_type: 'mcq' | 'msq' | 'nat'
}

export interface AdminTestResponse extends TestDetail {
  questions?: AdminTestQuestion[]
}

export type LoginRequest = components['schemas']['LoginRequest']
export type RegisterRequest = components['schemas']['RegisterRequest']
export type ResetPasswordRequest = components['schemas']['ResetPasswordRequest']
export type AuthUserResponse = components['schemas']['AuthUserResponse']
export type RoleUpdate = components['schemas']['RoleUpdate']
export type TestCreate = components['schemas']['TestCreate']
export type TestPatch = components['schemas']['TestPatch']
export type QuestionIn = components['schemas']['QuestionIn']
export type QuestionsBulk = components['schemas']['QuestionsBulk']
export type SeriesCreate = components['schemas']['SeriesCreate']
export type BookmarkNote = components['schemas']['BookmarkNote']
export type AnswerSubmit = components['schemas']['AnswerSubmit']
export type ViolationUpdate = components['schemas']['ViolationUpdate']

export interface AttemptAnswer {
  question_id: number
  selected_answer: string | null
  time_spent_seconds: number
}

export interface AttemptStart {
  id: number
  test_id: number
  status: TestStatus
  started_at: string | null
  submitted_at: string | null
  score: number | null
  total_marks: number | null
  tab_violations: number
  fullscreen_violations: number
  server_time: string
  answers: AttemptAnswer[]
  attempt_number: number
  max_attempts: number
}

export interface TestQuestion {
  id: number
  question_type: 'mcq' | 'msq' | 'nat'
  question_text?: string
  question_image_url?: string | null
  options?: unknown[] | Record<string, unknown>
  option_images?: Record<string, unknown> | null
  order_index?: number
  marks?: number
  negative_marks?: number
  subject?: string | null
  topic?: string | null
}

export interface SaveAnswersResponse {
  message: string
}

export interface ViolationUpdateResponse {
  message: string
}

export interface ResultAnswer {
  question_id?: number
  question_type?: 'mcq' | 'msq' | 'nat'
  question_image_url?: string | null
  option_images?: Record<string, unknown> | null
  marks?: number
  negative_marks?: number
  topper_answer?: string | null
  topper_time_seconds?: number
  is_correct?: boolean | null
  options?: unknown[]
  marks_awarded?: unknown
  question_text?: unknown
  selected_answer?: unknown
  correct_answer?: unknown
  time_spent_seconds?: unknown
}

export interface ResultData {
  test_title?: string
  attempt_number?: unknown
  submitted_at?: string | null
  score?: number
  total_marks?: unknown
  percentage?: number
  correct?: unknown
  incorrect?: unknown
  skipped?: unknown
  attempt_id?: number | string | null
  client_result_id?: string | null
  answers?: ResultAnswer[]
}

// TODO(response_model): response shape for GET /tests/attempt/{id}/result.
export interface PersistedResult extends ResultData {
  attempt_id: number
  client_result_id: string | null
  attempts_remaining: number
  max_attempts: number
  counts_for_leaderboard: boolean
  persisted: boolean
  test_id: number
  test_title: string
  score: number
  total_marks: number
  percentage: number
  correct: number
  incorrect: number
  skipped: number
  submitted_at: string | null
  tab_violations: number
  rank: number | null
  total_participants: number
  topper: unknown
  answers: ResultAnswer[]
}

export interface PracticeResult {
  id: string
  persisted: false
  result: ResultData & { attempt_id: string }
}

export interface SubmittedAttempt {
  id: number
  test_id: number
  status: TestStatus
  started_at: string | null
  submitted_at: string | null
  score: number | null
  total_marks: number | null
  tab_violations: number
  fullscreen_violations: number
  persisted: true
}

export type SubmitResult = SubmittedAttempt | PracticeResult

// TODO(response_model): response shape for GET /tests/my/history.
export interface HistoryItem {
  id: number
  test_id: number
  status: TestStatus
  started_at: string | null
  submitted_at: string | null
  score: number | null
  total_marks: number | null
  tab_violations: number
  fullscreen_violations: number
}

// TODO(response_model): response shape for GET /tests/{id}/my-attempts.
export interface MyAttempt {
  attempt_id: number
  attempt_number: number
  counts_for_leaderboard: boolean
  is_first: boolean
  status: TestStatus
  score: number | null
  total_marks: number | null
  percentage: number
  started_at: string | null
  submitted_at: string | null
  attempts_remaining: number
}

export interface LeaderboardEntry {
  rank: number
  user_id: number
  full_name: string
  score: number | null
  total_marks: number | null
  percentage: number
  submitted_at: string | null
  tab_violations: number
  is_current_user: boolean
}

// TODO(response_model): response shape for GET /tests/{id}/leaderboard.
export interface LeaderboardResponse {
  test_id: number
  test_title: string
  total_participants: number
  current_user_rank: number | null
  limit: number
  offset: number
  leaderboard: LeaderboardEntry[]
}

// TODO(response_model): response shape for GET /auth/me.
export interface MeResponse {
  id: number
  email: string
  full_name: string
  role: string
  is_active: boolean
  profile_photo: string | null
  created_at: string
}

// TODO(response_model): response shape for logout and reset-password.
export interface MessageResponse {
  message: string
}
// TODO(response_model): add response models for admin routes.
export type AdminResponse = unknown
// TODO(response_model): add response models for bookmark routes.
export type BookmarkResponse = unknown
// TODO(response_model): add response models for series routes.
export type SeriesResponse = unknown
