import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { downloadResultReport } from './reportGenerator'
import { testAPI } from '../api/api'

vi.mock('../api/api', () => ({
  testAPI: {
    downloadResultHtml: vi.fn(),
    downloadPracticeResultHtml: vi.fn(),
  },
}))

type DownloadResponse = Awaited<ReturnType<typeof testAPI.downloadResultHtml>>

function htmlResponse(body: string, type = 'text/html'): DownloadResponse {
  return { data: new Blob([body], { type }) } as DownloadResponse
}

describe('downloadResultReport', () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn<(object: Blob | MediaSource) => string>>
  let revokeObjectURLSpy: ReturnType<typeof vi.fn<(url: string) => void>>
  let mockLink: { href: string; download: string; click: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    createObjectURLSpy = vi.fn<(object: Blob | MediaSource) => string>(() => 'blob:mock-url')
    revokeObjectURLSpy = vi.fn<(url: string) => void>()
    window.URL.createObjectURL = createObjectURLSpy
    window.URL.revokeObjectURL = revokeObjectURLSpy

    mockLink = { href: '', download: '', click: vi.fn(), remove: vi.fn() }
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement)
    vi.spyOn(document.body, 'appendChild').mockImplementation(node => node)

    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('does nothing when there is no result', async () => {
    await downloadResultReport(null)
    await downloadResultReport(undefined)

    expect(testAPI.downloadResultHtml).not.toHaveBeenCalled()
    expect(testAPI.downloadPracticeResultHtml).not.toHaveBeenCalled()
    expect(createObjectURLSpy).not.toHaveBeenCalled()
  })

  it('downloads server-rendered HTML for a persisted attempt_id', async () => {
    vi.mocked(testAPI.downloadResultHtml).mockResolvedValueOnce(
      htmlResponse('<!DOCTYPE html><html><body>Server Rendered Report</body></html>'),
    )

    await downloadResultReport({ attempt_id: 42, test_title: 'GATE CS Mock 2026' })

    expect(testAPI.downloadResultHtml).toHaveBeenCalledWith(42)
    expect(testAPI.downloadPracticeResultHtml).not.toHaveBeenCalled()
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
    const blobArg = createObjectURLSpy.mock.calls[0][0] as Blob
    expect(blobArg).toBeInstanceOf(Blob)
    expect(blobArg.type).toBe('text/html')

    expect(mockLink.download).toBe('gate-cs-mock-2026-result.html')
    expect(mockLink.click).toHaveBeenCalledTimes(1)

    vi.runAllTimers()
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
  })

  it('posts only answers and attempt metadata for a practice result', async () => {
    vi.mocked(testAPI.downloadPracticeResultHtml).mockResolvedValueOnce(
      htmlResponse('<!DOCTYPE html><html><body>Practice Report</body></html>', 'text/html; charset=utf-8'),
    )

    await downloadResultReport({
      attempt_id: 'practice-9',
      client_result_id: 'practice-9',
      test_id: 7,
      test_title: 'Practice Test 101',
      attempt_number: 3,
      attempts_remaining: 2,
      submitted_at: '2026-06-23T12:00:00Z',
      tab_violations: 1,
      // Content fields that must never be sent to the server.
      score: 99,
      answers: [
        {
          question_id: 11,
          selected_answer: 'B',
          time_spent_seconds: 30,
          question_text: 'Should not be sent',
          correct_answer: 'A',
        },
        { question_id: 12, selected_answer: null },
      ],
    })

    expect(testAPI.downloadResultHtml).not.toHaveBeenCalled()
    expect(testAPI.downloadPracticeResultHtml).toHaveBeenCalledTimes(1)
    expect(testAPI.downloadPracticeResultHtml).toHaveBeenCalledWith({
      test_id: 7,
      answers: [
        { question_id: 11, selected_answer: 'B', time_spent_seconds: 30 },
        { question_id: 12, selected_answer: null, time_spent_seconds: 0 },
      ],
      client_result_id: 'practice-9',
      attempt_number: 3,
      attempts_remaining: 2,
      submitted_at: '2026-06-23T12:00:00Z',
      tab_violations: 1,
    })

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
    expect(mockLink.download).toBe('practice-test-101-practice-result.html')
    expect(mockLink.click).toHaveBeenCalledTimes(1)

    vi.runAllTimers()
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
  })

  it('treats a missing attempt_id as a practice result and applies defaults', async () => {
    vi.mocked(testAPI.downloadPracticeResultHtml).mockResolvedValueOnce(htmlResponse('<html></html>'))

    await downloadResultReport({ test_id: 5, test_title: 'No Attempt Id' })

    expect(testAPI.downloadResultHtml).not.toHaveBeenCalled()
    expect(testAPI.downloadPracticeResultHtml).toHaveBeenCalledWith({
      test_id: 5,
      answers: [],
      client_result_id: undefined,
      attempt_number: 2,
      attempts_remaining: 0,
      submitted_at: undefined,
      tab_violations: 0,
    })
  })

  it('drops answers that have no question_id', async () => {
    vi.mocked(testAPI.downloadPracticeResultHtml).mockResolvedValueOnce(htmlResponse('<html></html>'))

    await downloadResultReport({
      attempt_id: 'practice-1',
      test_id: 5,
      answers: [{ selected_answer: 'A' }, { question_id: 3, selected_answer: 'C', time_spent_seconds: 4 }],
    })

    expect(testAPI.downloadPracticeResultHtml).toHaveBeenCalledWith(
      expect.objectContaining({
        answers: [{ question_id: 3, selected_answer: 'C', time_spent_seconds: 4 }],
      }),
    )
  })

  it('caps client_result_id at the 64 characters the API accepts', async () => {
    vi.mocked(testAPI.downloadPracticeResultHtml).mockResolvedValueOnce(htmlResponse('<html></html>'))

    await downloadResultReport({ attempt_id: `practice-${'x'.repeat(100)}`, test_id: 5 })

    const [payload] = vi.mocked(testAPI.downloadPracticeResultHtml).mock.calls[0]
    expect(payload.client_result_id).toHaveLength(64)
  })

  it('rejects without calling the API or downloading when a practice result has no test_id', async () => {
    await expect(
      downloadResultReport({ attempt_id: 'practice-9', test_title: 'Missing test id' }),
    ).rejects.toThrow('Practice report requires a test id')

    expect(testAPI.downloadPracticeResultHtml).not.toHaveBeenCalled()
    expect(createObjectURLSpy).not.toHaveBeenCalled()
    expect(mockLink.click).not.toHaveBeenCalled()
  })

  it('propagates API errors (e.g. 403 without a prior submission) and does not download', async () => {
    vi.mocked(testAPI.downloadPracticeResultHtml).mockRejectedValueOnce(new Error('Request failed with status code 403'))

    await expect(
      downloadResultReport({ attempt_id: 'practice-9', test_id: 7 }),
    ).rejects.toThrow('403')

    expect(createObjectURLSpy).not.toHaveBeenCalled()
    expect(mockLink.click).not.toHaveBeenCalled()
  })
})
