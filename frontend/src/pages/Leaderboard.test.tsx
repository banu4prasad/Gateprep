import { cleanup, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import type { LeaderboardEntry } from '../types/api'
import {
  formatLeaderboardDate,
  getPercentageTone,
  getPodiumOrder,
  LeaderboardPodium,
  LeaderboardTable,
} from './Leaderboard'

afterEach(() => {
  cleanup()
})

describe('Leaderboard helpers', () => {
  it('orders podium entries as second, first, third', () => {
    const entries = [
      { rank: 1, user_id: 'u1', full_name: 'Alice' },
      { rank: 2, user_id: 'u2', full_name: 'Bob' },
      { rank: 3, user_id: 'u3', full_name: 'Charlie' },
    ]

    expect(getPodiumOrder(entries)).toEqual([entries[1], entries[0], entries[2]])
  })

  it('returns the correct percentage tone for score thresholds', () => {
    expect(getPercentageTone(80)).toBe('text-success-text')
    expect(getPercentageTone(60)).toBe('text-warning-text')
    expect(getPercentageTone(40)).toBe('text-destructive')
  })

  it('formats dates with the Indian locale and null-safe fallback', () => {
    expect(formatLeaderboardDate('2025-02-14T00:00:00Z')).toBe('14/2/2025')
    expect(formatLeaderboardDate(null)).toBe('—')
  })
})

describe('Leaderboard accessibility', () => {
  const entries: LeaderboardEntry[] = [
    {
      rank: 1,
      user_id: 1,
      full_name: 'Alice',
      score: 95,
      total_marks: 100,
      percentage: 95,
      submitted_at: '2025-02-14T00:00:00Z',
      tab_violations: 0,
      is_current_user: false,
    },
    {
      rank: 2,
      user_id: 2,
      full_name: 'Bob',
      score: 85,
      total_marks: 100,
      percentage: 85,
      submitted_at: '2025-02-14T00:00:00Z',
      tab_violations: 0,
      is_current_user: false,
    },
    {
      rank: 3,
      user_id: 3,
      full_name: 'Charlie',
      score: 75,
      total_marks: 100,
      percentage: 75,
      submitted_at: '2025-02-14T00:00:00Z',
      tab_violations: 0,
      is_current_user: false,
    },
    {
      rank: 4,
      user_id: 4,
      full_name: 'Dana',
      score: 65,
      total_marks: 100,
      percentage: 65,
      submitted_at: '2025-02-14T00:00:00Z',
      tab_violations: 0,
      is_current_user: false,
    },
  ]

  it('exposes accessible rank text for top 3 entries in LeaderboardTable', () => {
    render(<LeaderboardTable entries={entries} />)

    const rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('#1')).toBeInTheDocument()
    expect(within(rows[1]).getByText('#2')).toBeInTheDocument()
    expect(within(rows[2]).getByText('#3')).toBeInTheDocument()
    expect(within(rows[3]).getByText('#4')).toBeInTheDocument()
  })

  it('exposes accessible rank text on LeaderboardPodium cards', () => {
    render(<LeaderboardPodium entries={entries} />)

    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
    expect(screen.getByText('#3')).toBeInTheDocument()
  })
})
