import { testAPI } from '../api/api'
import type { AnswerSubmit, ResultAnswer, ResultData } from '../types/api'

function slugify(title: string | undefined): string {
  return (title || 'result').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Only the learner's own answers are sent. Question text, options, scores and
// explanations are re-hydrated from the database by the server.
function toAnswerSubmits(answers: ResultAnswer[] | undefined): AnswerSubmit[] {
  const items: AnswerSubmit[] = []
  for (const answer of answers ?? []) {
    if (typeof answer.question_id !== 'number') continue
    items.push({
      question_id: answer.question_id,
      selected_answer: answer.selected_answer ?? null,
      time_spent_seconds: answer.time_spent_seconds ?? 0,
    })
  }
  return items
}

function saveBlob(data: Blob | string, filename: string): void {
  const blob = data instanceof Blob ? data : new Blob([data], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

async function fetchPracticeReport(result: ResultData) {
  if (typeof result.test_id !== 'number') {
    throw new Error('Practice report requires a test id')
  }
  const clientResultId =
    result.client_result_id ?? (result.attempt_id != null ? String(result.attempt_id) : undefined)

  return testAPI.downloadPracticeResultHtml({
    test_id: result.test_id,
    answers: toAnswerSubmits(result.answers),
    client_result_id: clientResultId?.slice(0, 64),
    attempt_number: result.attempt_number ?? 2,
    attempts_remaining: result.attempts_remaining ?? 0,
    submitted_at: result.submitted_at ?? undefined,
    tab_violations: result.tab_violations ?? 0,
  })
}

export async function downloadResultReport(result: ResultData | null | undefined): Promise<void> {
  if (!result) return

  const slug = slugify(result.test_title) || 'test'
  const attemptId = result.attempt_id

  if (attemptId == null || String(attemptId).startsWith('practice-')) {
    const res = await fetchPracticeReport(result)
    saveBlob(res.data, `${slug}-practice-result.html`)
    return
  }

  const res = await testAPI.downloadResultHtml(attemptId)
  saveBlob(res.data, `${slug}-result.html`)
}
