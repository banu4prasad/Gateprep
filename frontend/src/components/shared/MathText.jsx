import { Fragment } from 'react'
import { InlineMath, BlockMath } from 'react-katex'

const MATH_PATTERN = /(\$\$[\s\S]+?\$\$|\$[^$]+\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g
const RAW_LATEX_HINT = /\\(sqrt|frac|sum|int|log|ln|sin|cos|tan|alpha|beta|gamma|theta|pi|infty)|[\^_]\{?[\w\d]+/

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
    .replace(/\blog~/g, '\\log ')
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

export default function MathText({ children }) {
  const text = String(children ?? '')

  if (!text.trim()) return null

  const hasExplicitMath = MATH_PATTERN.test(text)
  MATH_PATTERN.lastIndex = 0

  if (!hasExplicitMath && RAW_LATEX_HINT.test(text)) {
    return <SafeInlineMath math={text} />
  }

  if (!hasExplicitMath) {
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
}
