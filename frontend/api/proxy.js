const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function buildTargetUrl(req) {
  const base = process.env.API_PROXY_TARGET || process.env.BACKEND_URL
  if (!base) {
    throw new Error('API_PROXY_TARGET is not configured')
  }

  const incoming = new URL(req.url, 'http://localhost')
  const path = incoming.searchParams.get('path') || ''
  incoming.searchParams.delete('path')

  const target = new URL(path.replace(/^\/+/, ''), `${base.replace(/\/+$/, '')}/`)
  incoming.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value)
  })

  return target
}

function copyResponseHeaders(response, res) {
  response.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase()
    if (lowerKey !== 'set-cookie' && !HOP_BY_HOP_HEADERS.has(lowerKey)) {
      res.setHeader(key, value)
    }
  })

  const cookies = response.headers.getSetCookie?.()
  if (cookies?.length) {
    res.setHeader('set-cookie', cookies)
    return
  }

  const cookie = response.headers.get('set-cookie')
  if (cookie) {
    res.setHeader('set-cookie', cookie)
  }
}

export default async function handler(req, res) {
  let target
  try {
    target = buildTargetUrl(req)
  } catch (error) {
    res.statusCode = 500
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ detail: error.message }))
    return
  }

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    const lowerKey = key.toLowerCase()
    if (!HOP_BY_HOP_HEADERS.has(lowerKey) && value !== undefined) {
      headers.set(key, Array.isArray(value) ? value.join(', ') : value)
    }
  }

  const hasBody = !['GET', 'HEAD'].includes(req.method)
  const response = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? await readRequestBody(req) : undefined,
    redirect: 'manual',
  })

  res.statusCode = response.status
  copyResponseHeaders(response, res)
  res.end(Buffer.from(await response.arrayBuffer()))
}
