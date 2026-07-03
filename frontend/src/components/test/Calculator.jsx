import { useEffect, useRef, useState, useCallback } from 'react'
import X from 'lucide-react/dist/esm/icons/x'

const DEG_TO_RAD = Math.PI / 180
const OPERATORS = new Set(['+', '-', '×', '÷', 'xʸ', '%'])
const OPERATOR_PRECEDENCE = { '+': 1, '-': 1, '×': 2, '÷': 2, '%': 2, 'xʸ': 3 }

const formatResult = (value) => {
  if (!Number.isFinite(value)) return 'Error'
  return String(parseFloat(value.toFixed(10)))
}

const isOperatorToken = (token) => OPERATORS.has(token)
const isOperatorTail = (expression) => isOperatorToken(expression.trim().split(/\s+/).at(-1))

const tokenizeExpression = (expression) => expression.trim().split(/\s+/).filter(Boolean)

const applyOperator = (op, left, right) => {
  switch (op) {
    case '+': return left + right
    case '-': return left - right
    case '×': return left * right
    case '÷': return right !== 0 ? left / right : NaN
    case 'xʸ': return Math.pow(left, right)
    case '%': return left % right
    default: return NaN
  }
}

const evaluateExpression = (expression) => {
  const output = []
  const operators = []

  tokenizeExpression(expression).forEach((token) => {
    if (!Number.isNaN(Number(token))) {
      output.push(Number(token))
      return
    }

    if (isOperatorToken(token)) {
      while (
        operators.length > 0 &&
        isOperatorToken(operators.at(-1)) &&
        OPERATOR_PRECEDENCE[operators.at(-1)] >= OPERATOR_PRECEDENCE[token]
      ) {
        output.push(operators.pop())
      }
      operators.push(token)
      return
    }

    if (token === '(') {
      operators.push(token)
      return
    }

    if (token === ')') {
      while (operators.length > 0 && operators.at(-1) !== '(') {
        output.push(operators.pop())
      }
      if (operators.at(-1) !== '(') throw new Error('Mismatched parentheses')
      operators.pop()
      return
    }

    throw new Error('Invalid token')
  })

  while (operators.length > 0) {
    const op = operators.pop()
    if (op === '(' || op === ')') throw new Error('Mismatched parentheses')
    output.push(op)
  }

  const stack = []
  output.forEach((token) => {
    if (typeof token === 'number') {
      stack.push(token)
      return
    }

    const right = stack.pop()
    const left = stack.pop()
    if (left === undefined || right === undefined) throw new Error('Invalid expression')
    stack.push(applyOperator(token, left, right))
  })

  if (stack.length !== 1) throw new Error('Invalid expression')
  return stack[0]
}

export default function Calculator({ onClose }) {
  const dialogRef = useRef(null)
  const expressionRef = useRef('')
  const [display, setDisplay] = useState('0')
  const [expression, setExpression] = useState('')
  const [memory, setMemory] = useState(0)
  const [isDeg, setIsDeg] = useState(true)
  const [waitingForOperand, setWaitingForOperand] = useState(false)

  const getAngle = (val) => isDeg ? val * DEG_TO_RAD : val

  const setExpressionText = useCallback((next) => {
    const value = typeof next === 'function' ? next(expressionRef.current) : next
    expressionRef.current = value
    setExpression(value)
  }, [])

  useEffect(() => {
    const firstButton = dialogRef.current?.querySelector('button')
    firstButton?.focus()
  }, [])

  const inputDigit = (digit) => {
    if (waitingForOperand) {
      setDisplay(String(digit))
      setWaitingForOperand(false)
    } else {
      setDisplay(display === '0' ? String(digit) : display + digit)
    }
  }

  const inputDecimal = () => {
    if (waitingForOperand) { setDisplay('0.'); setWaitingForOperand(false); return }
    if (!display.includes('.')) setDisplay(display + '.')
  }

  const handleOperator = (op) => {
    setExpressionText(prev => {
      const trimmed = prev.trim()
      if (!trimmed) return `${display} ${op}`
      if (isOperatorTail(trimmed)) return `${trimmed.slice(0, trimmed.lastIndexOf(' ')).trim()} ${op}`
      if (trimmed.endsWith(')')) return `${trimmed} ${op}`
      return `${trimmed} ${display} ${op}`
    })
    setWaitingForOperand(true)
  }

  const inputOpenParen = () => {
    setExpressionText(prev => {
      const trimmed = prev.trim()
      if (!trimmed) return '('
      if (isOperatorTail(trimmed) || trimmed.endsWith('(')) return `${trimmed} (`
      return `${trimmed} ${display} × (`
    })
    setDisplay('0')
    setWaitingForOperand(true)
  }

  const inputCloseParen = () => {
    const tokens = tokenizeExpression(expressionRef.current)
    const openCount = tokens.filter(token => token === '(').length
    const closeCount = tokens.filter(token => token === ')').length
    if (openCount <= closeCount) return

    setExpressionText(prev => {
      const trimmed = prev.trim()
      if (!trimmed || trimmed.endsWith('(')) return trimmed
      if (trimmed.endsWith(')')) return `${trimmed} )`
      return `${trimmed} ${display} )`
    })
    setWaitingForOperand(false)
  }

  const calculate = () => {
    if (!expressionRef.current) return
    try {
      const trimmed = expressionRef.current.trim()
      const finalExpression = trimmed.endsWith(')') ? trimmed : `${trimmed} ${display}`
      setDisplay(formatResult(evaluateExpression(finalExpression)))
      setExpressionText('')
      setWaitingForOperand(true)
    } catch { setDisplay('Error') }
  }

  const sciFunc = (fn) => {
    const val = parseFloat(display)
    let result
    try {
      switch (fn) {
        case 'sin':   result = Math.sin(getAngle(val)); break
        case 'cos':   result = Math.cos(getAngle(val)); break
        case 'tan':   result = Math.tan(getAngle(val)); break
        case 'sin⁻¹': result = isDeg ? Math.asin(val) / DEG_TO_RAD : Math.asin(val); break
        case 'cos⁻¹': result = isDeg ? Math.acos(val) / DEG_TO_RAD : Math.acos(val); break
        case 'tan⁻¹': result = isDeg ? Math.atan(val) / DEG_TO_RAD : Math.atan(val); break
        case 'log':   result = Math.log10(val); break
        case 'ln':    result = Math.log(val); break
        case 'log₂':  result = Math.log2(val); break
        case '√':     result = Math.sqrt(val); break
        case 'x²':    result = val * val; break
        case 'x³':    result = val * val * val; break
        case '1/x':   result = 1 / val; break
        case 'n!':    result = factorial(val); break
        case 'eˣ':    result = Math.exp(val); break
        case '10ˣ':   result = Math.pow(10, val); break
        case '|x|':   result = Math.abs(val); break
        case 'π':     setDisplay(String(Math.PI)); return
        case 'e':     setDisplay(String(Math.E)); return
        default: return
      }
      setDisplay(formatResult(result))
      setWaitingForOperand(true)
    } catch { setDisplay('Error') }
  }

  const factorial = (n) => {
    if (n < 0 || !Number.isInteger(n)) return NaN
    if (n === 0 || n === 1) return 1
    let r = 1; for (let i = 2; i <= n; i++) r *= i; return r
  }

  const clear = () => { setDisplay('0'); setExpressionText(''); setWaitingForOperand(false) }
  const backspace = () => { setDisplay(display.length > 1 ? display.slice(0, -1) : '0') }
  const toggleSign = () => setDisplay(String(parseFloat(display) * -1))

  const handleDialogKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key !== 'Tab') return

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll('button:not([disabled])') || []
    )
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }, [onClose])

  const Btn = ({ label, onClick, type = 'default', wide = false }) => (
    <button onClick={onClick}
      className={`calc-btn ${type === 'op' ? 'calc-btn-op' : type === 'eq' ? 'calc-btn-eq' : type === 'clear' ? 'calc-btn-clear' : type === 'back' ? 'calc-btn-backspace' : ''} ${wide ? 'col-span-2' : ''}`}>
      {label}
    </button>
  )

  return (
    <div ref={dialogRef}
         className="fixed z-50 shadow-2xl rounded-lg overflow-hidden select-none sm:w-[320px] left-4 right-4 sm:left-auto sm:right-4"
         role="dialog" aria-modal="true" aria-labelledby="calculator-title"
         onKeyDown={handleDialogKeyDown}
         style={{ top: '70px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b"
           style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
        <span id="calculator-title" className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Scientific Calculator</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <button onClick={() => setIsDeg(true)}
              className={`px-2 py-0.5 rounded ${isDeg ? 'bg-sky-600 text-white' : ''}`}>Deg</button>
            <button onClick={() => setIsDeg(false)}
              className={`px-2 py-0.5 rounded ${!isDeg ? 'bg-sky-600 text-white' : ''}`}>Rad</button>
          </div>
          <button onClick={onClose} aria-label="Close Calculator" className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200"><X size={16} /></button>
        </div>
      </div>

      {/* Display */}
      <div className="px-3 py-2 text-right" style={{ background: 'var(--bg)' }}>
        <div className="text-xs h-4 mb-1" style={{ color: 'var(--text-muted)' }}>{expression}</div>
        <div className="text-2xl font-mono font-bold truncate" style={{ color: 'var(--text)' }}>{display}</div>
      </div>

      {/* Memory row */}
      <div className="grid grid-cols-5 gap-1 px-2 pb-1">
        {[
          { l: 'MC', fn: () => setMemory(0) },
          { l: 'MR', fn: () => { setDisplay(String(memory)); setWaitingForOperand(false) } },
          { l: 'MS', fn: () => setMemory(parseFloat(display)) },
          { l: 'M+', fn: () => setMemory(m => m + parseFloat(display)) },
          { l: 'M-', fn: () => setMemory(m => m - parseFloat(display)) },
        ].map(({ l, fn }) => (
          <button key={l} onClick={fn}
            className="calc-btn text-xs h-7" style={{ background: '#1a3060', color: '#93c5fd' }}>{l}</button>
        ))}
      </div>

      {/* Scientific functions */}
      <div className="grid grid-cols-5 gap-1 px-2 pb-1">
        {['sin','cos','tan','log','ln',
          'sin⁻¹','cos⁻¹','tan⁻¹','log₂','eˣ',
          'x²','x³','√','10ˣ','1/x',
          'n!','|x|','π','e','%'].map(fn => (
          <button key={fn} onClick={() => sciFunc(fn)}
            className="calc-btn text-xs h-8" style={{ background: 'var(--bg-panel)', color: 'var(--brand-light)' }}>{fn}</button>
        ))}
      </div>

      {/* Main keypad */}
      <div className="grid grid-cols-5 gap-1 px-2 pb-2">
        <Btn label="C" onClick={clear} type="clear" />
        <Btn label="+/-" onClick={toggleSign} />
        <Btn label="←" onClick={backspace} type="back" />
        <Btn label="xʸ" onClick={() => handleOperator('xʸ')} type="op" />
        <Btn label="÷" onClick={() => handleOperator('÷')} type="op" />

        <Btn label="7" onClick={() => inputDigit('7')} />
        <Btn label="8" onClick={() => inputDigit('8')} />
        <Btn label="9" onClick={() => inputDigit('9')} />
        <Btn label="×" onClick={() => handleOperator('×')} type="op" />
        <Btn label="(" onClick={inputOpenParen} />

        <Btn label="4" onClick={() => inputDigit('4')} />
        <Btn label="5" onClick={() => inputDigit('5')} />
        <Btn label="6" onClick={() => inputDigit('6')} />
        <Btn label="-" onClick={() => handleOperator('-')} type="op" />
        <Btn label=")" onClick={inputCloseParen} />

        <Btn label="1" onClick={() => inputDigit('1')} />
        <Btn label="2" onClick={() => inputDigit('2')} />
        <Btn label="3" onClick={() => inputDigit('3')} />
        <Btn label="+" onClick={() => handleOperator('+')} type="op" />
        <Btn label="%" onClick={() => handleOperator('%')} type="op" />

        <Btn label="0" onClick={() => inputDigit('0')} wide />
        <Btn label="." onClick={inputDecimal} />
        <Btn label="=" onClick={calculate} type="eq" wide />
      </div>
    </div>
  )
}
