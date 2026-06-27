import { Fragment, memo } from 'react'
import { InlineMath, BlockMath } from 'react-katex'
import 'katex/dist/katex.min.css'

// ── Table detection ──────────────────────────────────────────────
// Require 3+ pipes (2+ columns) so |x| (absolute value) never matches
const TABLE_LINE = /^\|.+\|.+\|$/
const SEPARATOR_ROW = /^\|[-| :]+\|$/
// Multiline anchors: only match whole lines starting/ending with |, not mid-line |x|
const BLOCK_SPLIT = /((?:^\|.+\|.+\|[ \t]*$\n?)+)/gm

function isTableBlock(text) {
  const lines = text.trim().split('\n').map(l => l.trim())
  // A real table MUST have a separator row (e.g. |---|---|)
  const hasSeparator = lines.some(l => SEPARATOR_ROW.test(l))
  if (!hasSeparator) return false
  // And at least one data row with 2+ columns
  return lines.some(l => TABLE_LINE.test(l) && !SEPARATOR_ROW.test(l))
}

/** Split a row on unescaped | characters, respecting \| as a literal pipe. */
function splitTableCells(row, expectedCols) {
  const inner = row.slice(1, -1) // strip leading/trailing |
  const cells = []
  let current = ''

  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '\\' && i + 1 < inner.length && inner[i + 1] === '|') {
      current += '|' // escaped pipe → literal |
      i++
    } else if (inner[i] === '|') {
      cells.push(current.trim())
      current = ''
    } else {
      current += inner[i]
    }
  }
  cells.push(current.trim())

  // If we got more cells than expected (unescaped | inside content),
  // merge the extras back into the cell before the last column.
  if (expectedCols && cells.length > expectedCols) {
    const merged = []
    const extraCount = cells.length - expectedCols
    for (let i = 0; i < cells.length; i++) {
      if (i > 0 && i <= extraCount) {
        merged[merged.length - 1] += ' | ' + cells[i]
      } else {
        merged.push(cells[i])
      }
    }
    return merged
  }

  return cells
}

function parseTable(text) {
  const allRows = text.trim().split('\n').map(l => l.trim()).filter(l => TABLE_LINE.test(l))

  // Detect column count from the separator row (e.g. |---|---|)
  const sepRow = allRows.find(r => SEPARATOR_ROW.test(r))
  const expectedCols = sepRow ? sepRow.slice(1, -1).split('|').length : null

  const dataRows = allRows.filter(l => !SEPARATOR_ROW.test(l))

  return (
    <table className="w-full border-collapse text-sm my-2">
      <tbody>
        {dataRows.map((row, i) => {
          const cells = splitTableCells(row, expectedCols)
          const Tag = i === 0 ? 'th' : 'td'
          return (
            <tr key={i} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
              {cells.map((cell, j) => (
                <Tag key={j} className="border border-border px-3 py-1.5 text-left font-mono">
                  {cell}
                </Tag>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Math patterns ────────────────────────────────────────────────
const MATH_PATTERN = /(\$\$[\s\S]+?\$\$|\$[^$]+\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g
const LEGACY_MATH_PATTERN = /(\\(?:sqrt|frac|sum|int|log|ln|sin|cos|tan|alpha|beta|gamma|theta|Theta|pi|infty|Omega)(?:\s*(?:\{[^{}]*\}|\([^()]*\)|[A-Za-z0-9]+))*|\\?(?:Theta|Omega)\s*\([^()]+\)|\bO\s*\([^()]+\)|\b[A-Za-z0-9]+\s*\^\s*(?:\{[^{}]+\}|\([^()]+\)|[A-Za-z0-9]+)(?:\s*[-+]\s*\d+)?|\b(?:[A-Za-z]\s+)?(?:log|ln)(?:\s*\^\s*(?:\{[^{}]+\}|\([^()]+\)|[A-Za-z0-9]+))?\s+[A-Za-z]\b)/g
const RAW_LATEX_HINT = /\\(sqrt|frac|sum|int|log|ln|sin|cos|tan|alpha|beta|gamma|theta|Theta|pi|infty|Omega)|\\?(Theta|Omega)\s*\(|\bO\s*\(|[\^_]\{?[\w\d]+|\b(?:[A-Za-z]\s+)?(?:log|ln)(?:\s*\^\s*[\w\d]+)?\s+[A-Za-z]\b/
const MATH_WORDS = new Set([
  'O', 'o', 'n', 'h', 'm', 'k', 'x', 'y', 'z',
  'log', 'ln', 'sin', 'cos', 'tan',
  'sqrt', 'frac', 'sum', 'int',
  'Theta', 'theta', 'Omega',
  'alpha', 'beta', 'gamma', 'pi', 'infty',
])

function normalizeMath(math) {
  return math
    .replace(/^\\\(/, '')
    .replace(/\\\)$/, '')
    .replace(/^\\\[/, '')
    .replace(/\\\]$/, '')
    .replace(/^\$\$/, '')
    .replace(/\$\$$/, '')
    .replace(/^\$/, '')
    .replace(/\$$/, '')
    .replace(/(^|[^\\])\blog~/g, '$1\\log ')
    .replace(/\^\(([^()]+)\)/g, '^{$1}')
    .replace(/(^|[^\\])\b(log|ln|sin|cos|tan)\b/g, '$1\\$2')
    .replace(/(^|[^\\])\bTheta\b/g, '$1\\Theta')
    .replace(/(^|[^\\])\bOmega\b/g, '$1\\Omega')
}

function mathAriaLabel(math) {
  const label = normalizeMath(math)
    .replace(/\\frac/g, ' fraction ')
    .replace(/\\sqrt/g, ' square root ')
    .replace(/\\sum/g, ' summation ')
    .replace(/\\int/g, ' integral ')
    .replace(/\\log/g, ' log ')
    .replace(/\\ln/g, ' natural log ')
    .replace(/\\sin/g, ' sine ')
    .replace(/\\cos/g, ' cosine ')
    .replace(/\\tan/g, ' tangent ')
    .replace(/\\Theta/g, ' Theta ')
    .replace(/\\Omega/g, ' Omega ')
    .replace(/\\alpha/g, ' alpha ')
    .replace(/\\beta/g, ' beta ')
    .replace(/\\gamma/g, ' gamma ')
    .replace(/\\theta/g, ' theta ')
    .replace(/\\pi/g, ' pi ')
    .replace(/\\infty/g, ' infinity ')
    .replace(/\^/g, ' to the power of ')
    .replace(/_/g, ' subscript ')
    .replace(/\\/g, ' ')
    .replace(/[{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return `Math expression: ${label}`
}

function isStandaloneMath(text) {
  const trimmed = text.trim()
  if (!RAW_LATEX_HINT.test(trimmed)) return false

  const words = trimmed.match(/[A-Za-z]+/g) || []
  if (words.some(word => word.length > 1 && !MATH_WORDS.has(word))) {
    return false
  }

  return true
}

function splitLegacyMath(text) {
  const parts = []
  let lastIndex = 0

  LEGACY_MATH_PATTERN.lastIndex = 0

  for (const match of text.matchAll(LEGACY_MATH_PATTERN)) {
    const value = match[0]
    const index = match.index ?? 0

    if (index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, index) })
    }

    parts.push({ type: 'math', value })
    lastIndex = index + value.length
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return parts
}

function SafeInlineMath({ math }) {
  const ariaLabel = mathAriaLabel(math)

  try {
    return (
      <span role="math" aria-label={ariaLabel}>
        <InlineMath
          math={normalizeMath(math)}
          renderError={() => <span>{math}</span>}
        />
      </span>
    )
  } catch {
    return <span role="math" aria-label={ariaLabel}>{math}</span>
  }
}

function SafeBlockMath({ math }) {
  const ariaLabel = mathAriaLabel(math)

  try {
    return (
      <div role="math" aria-label={ariaLabel}>
        <BlockMath
          math={normalizeMath(math)}
          renderError={() => <span>{math}</span>}
        />
      </div>
    )
  } catch {
    return <div role="math" aria-label={ariaLabel}>{math}</div>
  }
}

function renderMathSegment(text, keyPrefix = '') {
  const hasExplicitMath = MATH_PATTERN.test(text)
  MATH_PATTERN.lastIndex = 0

  if (!hasExplicitMath && isStandaloneMath(text)) {
    return <SafeInlineMath math={text} />
  }

  if (!hasExplicitMath) {
    const legacyParts = splitLegacyMath(text)
    const hasLegacyMath = legacyParts.some(part => part.type === 'math')

    if (hasLegacyMath) {
      return (
        <>
          {legacyParts.map((part, index) => {
            if (part.type === 'math') {
              return <SafeInlineMath key={`${keyPrefix}l${index}`} math={part.value} />
            }
            return <Fragment key={`${keyPrefix}l${index}`}>{part.value}</Fragment>
          })}
        </>
      )
    }

    return <>{text}</>
  }

  const parts = text.split(MATH_PATTERN)

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null

        const isBlock =
          part.startsWith('$$') ||
          part.startsWith('\\[')

        const isInline =
          part.startsWith('$') ||
          part.startsWith('\\(')

        if (isBlock) {
          return <SafeBlockMath key={`${keyPrefix}m${index}`} math={part} />
        }

        if (isInline) {
          return <SafeInlineMath key={`${keyPrefix}m${index}`} math={part} />
        }

        return <Fragment key={`${keyPrefix}m${index}`}>{part}</Fragment>
      })}
    </>
  )
}

const MathText = memo(function MathText({ children }) {
  const text = String(children ?? '')

  if (!text.trim()) return null

  // Split on table blocks first, then parse math in non-table segments
  const segments = text.split(BLOCK_SPLIT)

  const hasTable = segments.some(seg => isTableBlock(seg))

  if (!hasTable) {
    return renderMathSegment(text)
  }

  return (
    <>
      {segments.map((seg, i) =>
        isTableBlock(seg)
          ? <Fragment key={i}>{parseTable(seg)}</Fragment>
          : <Fragment key={i}>{renderMathSegment(seg, `s${i}`)}</Fragment>
      )}
    </>
  )
})

export default MathText;
