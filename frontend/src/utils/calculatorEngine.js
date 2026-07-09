const DEG_TO_RAD = Math.PI / 180
const OPERATORS = new Set(['+', '-', '×', '÷', 'xʸ', '%'])
const OPERATOR_PRECEDENCE = { '+': 1, '-': 1, '×': 2, '÷': 2, '%': 2, 'xʸ': 3 }

export const formatResult = (value) => {
  if (!Number.isFinite(value)) return 'Error'
  return String(parseFloat(value.toFixed(10)))
}

const isOperatorToken = (token) => OPERATORS.has(token)

export const isOperatorTail = (expression) => isOperatorToken(expression.trim().split(/\s+/).at(-1))

export const tokenizeExpression = (expression) => expression.trim().split(/\s+/).filter(Boolean)

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

export const evaluateExpression = (expression) => {
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

export { DEG_TO_RAD }