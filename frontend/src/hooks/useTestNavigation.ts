import { useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SERIES_LABELS, TYPE_LABELS } from '../utils/constants'
import type { TestCatalogItem } from '@/types/api'

export type NavigationType = 'category' | 'series' | 'type' | 'subject'
export interface NavigationStep { type: NavigationType; value: string }
export interface TestNavigationParams { tests: TestCatalogItem[] }
export interface TestNavigationResult {
  nav: NavigationStep[]
  currentNav: NavigationStep | undefined
  push: (type: NavigationType, value: string) => void
  goBack: (idx: number) => void
  filteredTests: TestCatalogItem[]
  breadcrumbs: string[]
}

export const NONE_SUBJECT_PARAM = '_none'

const VALID_CATEGORIES = new Set(['weekly_quiz', 'test_series'])
const VALID_SERIES = new Set(Object.keys(SERIES_LABELS))
const VALID_TYPES = new Set(Object.keys(TYPE_LABELS))

function stepsToSearchParams(steps: NavigationStep[]): URLSearchParams {
  const params = new URLSearchParams()
  steps.forEach(step => {
    params.set(step.type, step.value)
  })
  return params
}

function parseNavigationSteps(searchParams: URLSearchParams): NavigationStep[] {
  const category = searchParams.get('category')
  if (!category || !VALID_CATEGORIES.has(category)) {
    return []
  }

  const steps: NavigationStep[] = [{ type: 'category', value: category }]
  const subject = searchParams.get('subject')

  if (category === 'weekly_quiz') {
    if (subject && subject.trim() !== '') {
      steps.push({ type: 'subject', value: subject })
    }
    return steps
  }

  const series = searchParams.get('series')
  if (!series || !VALID_SERIES.has(series)) {
    return steps
  }
  steps.push({ type: 'series', value: series })

  const testType = searchParams.get('type')
  if (!testType || !VALID_TYPES.has(testType)) {
    return steps
  }
  steps.push({ type: 'type', value: testType })

  if (testType === 'topic_wise' && subject && subject.trim() !== '') {
    steps.push({ type: 'subject', value: subject })
  }

  return steps
}

/** Sync nested `/tests` category drill-down state with URL search parameters. */
export function useTestNavigation(tests: TestCatalogItem[]): TestNavigationResult {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawSearch = searchParams.toString()

  const { nav, canonicalParams, needsReplace } = useMemo(() => {
    const parsedParams = new URLSearchParams(rawSearch)
    const steps = parseNavigationSteps(parsedParams)
    const canonical = stepsToSearchParams(steps)
    return {
      nav: steps,
      canonicalParams: canonical,
      needsReplace: parsedParams.toString() !== canonical.toString(),
    }
  }, [rawSearch])

  useEffect(() => {
    if (needsReplace) {
      setSearchParams(canonicalParams, { replace: true })
    }
  }, [needsReplace, canonicalParams, setSearchParams])

  const push = useCallback((type: NavigationType, value: string) => {
    const nextSteps = [...nav, { type, value }]
    setSearchParams(stepsToSearchParams(nextSteps))
  }, [nav, setSearchParams])

  const goBack = useCallback((idx: number) => {
    const nextSteps = nav.slice(0, idx)
    setSearchParams(stepsToSearchParams(nextSteps))
  }, [nav, setSearchParams])

  const filteredTests = useMemo(() => {
    let filtered = tests
    nav.forEach(step => {
      if (step.type === 'category') filtered = filtered.filter(t => t.category === step.value)
      if (step.type === 'series')   filtered = filtered.filter(t => t.series_name === step.value)
      if (step.type === 'type')     filtered = filtered.filter(t => t.test_type === step.value)
      if (step.type === 'subject') {
        filtered = step.value === NONE_SUBJECT_PARAM
          ? filtered.filter(t => !t.subject)
          : filtered.filter(t => t.subject === step.value)
      }
    })
    return filtered
  }, [tests, nav])

  const breadcrumbs = useMemo(() => ['Tests', ...nav.map(s => {
    if (s.type === 'category') return s.value === 'weekly_quiz' ? 'Weekly Quiz' : 'Test Series'
    if (s.type === 'series')   return SERIES_LABELS[s.value] || s.value
    if (s.type === 'type')     return TYPE_LABELS[s.value] || s.value
    if (s.type === 'subject')  return s.value === NONE_SUBJECT_PARAM ? 'General' : s.value
    return s.value
  })], [nav])

  const currentNav = nav[nav.length - 1]

  return { nav, currentNav, push, goBack, filteredTests, breadcrumbs }
}
