import { Fragment, memo } from 'react'
import { InlineMath, BlockMath } from 'react-katex'

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
  try {
    return (
      <InlineMath
        math={normalizeMath(math)}
        renderError={() => <span>{math}</span>}
      />
    )
  } catch {
    return <span>{math}</span>
  }
}

function SafeBlockMath({ math }) {
  try {
    return (
      <BlockMath
        math={normalizeMath(math)}
        renderError={() => <span>{math}</span>}
      />
    )
  } catch {
    return <span>{math}</span>
  }
}

const MathText = memo(function MathText({ children }) {
  const text = String(children ?? '')

  if (!text.trim()) return null

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
              return <SafeInlineMath key={index} math={part.value} />
            }

            return <Fragment key={index}>{part.value}</Fragment>
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
          return <SafeBlockMath key={index} math={part} />
        }

        if (isInline) {
          return <SafeInlineMath key={index} math={part} />
        }

        return <Fragment key={index}>{part}</Fragment>
      })}
    </>
  )
})

export default MathText;
