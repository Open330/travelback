import { createServer } from 'node:http'
import { constants } from 'node:fs'
import { access, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const args = process.argv.slice(2)

function readArg(name, fallback) {
  const index = args.indexOf(`--${name}`)
  if (index === -1) return fallback
  return args[index + 1] ?? fallback
}

function normalizeBasePath(value) {
  if (!value || value === '/') return '/'
  const trimmed = value.replace(/\/+$/, '')
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function isInside(parent, child) {
  return child === parent || child.startsWith(`${parent}${path.sep}`)
}

const outDir = path.resolve(process.cwd(), 'out')
const port = Number(readArg('port', process.env.PORT ?? '3000'))
const basePath = normalizeBasePath(readArg('base-path', process.env.STATIC_BASE_PATH ?? '/'))

if (!Number.isInteger(port) || port <= 0) {
  console.error(`[serve-static] Invalid port: ${port}`)
  process.exit(1)
}

try {
  await access(outDir, constants.R_OK)
} catch {
  console.error('[serve-static] Missing ./out directory. Run `npm run build` first.')
  process.exit(1)
}

const mimeTypes = new Map([
  ['.avif', 'image/avif'],
  ['.css', 'text/css; charset=utf-8'],
  ['.gpx', 'application/gpx+xml; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff2', 'font/woff2'],
])

function resolveContentType(filePath) {
  return mimeTypes.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream'
}

function resolveCacheControl(filePath) {
  const relativePath = path.relative(outDir, filePath).split(path.sep).join('/')
  if (relativePath.endsWith('.html')) return 'no-cache'
  if (relativePath.startsWith('_next/static/')) return 'public, max-age=31536000, immutable'
  return 'public, max-age=3600'
}

async function resolveFile(urlPathname) {
  if (basePath !== '/') {
    if (urlPathname === '/' || urlPathname === '') {
      return { redirect: `${basePath}/` }
    }

    if (urlPathname === basePath) {
      return { redirect: `${basePath}/` }
    }

    if (!urlPathname.startsWith(`${basePath}/`)) {
      return { status: 404 }
    }

    urlPathname = urlPathname.slice(basePath.length)
  }

  let relativePath
  try {
    relativePath = decodeURIComponent(urlPathname).replace(/^\/+/, '')
  } catch {
    return { status: 400 }
  }

  if (relativePath.includes('\0')) {
    return { status: 400 }
  }

  const requestedPath = path.normalize(relativePath === '' ? 'index.html' : relativePath)
  let absolutePath = path.resolve(outDir, requestedPath)

  if (!isInside(outDir, absolutePath)) {
    return { status: 403 }
  }

  try {
    let stats = await stat(absolutePath)
    if (stats.isDirectory()) {
      absolutePath = path.join(absolutePath, 'index.html')
      stats = await stat(absolutePath)
    }

    if (!stats.isFile()) {
      return { status: 404 }
    }

    return { status: 200, absolutePath }
  } catch {
    return { status: 404 }
  }
}

const server = createServer(async (req, res) => {
  const method = req.method ?? 'GET'

  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Method Not Allowed')
    return
  }

  try {
    const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
    const resolved = await resolveFile(requestUrl.pathname)

    if ('redirect' in resolved) {
      res.writeHead(302, { Location: resolved.redirect })
      res.end()
      return
    }

    if (resolved.status !== 200 || !('absolutePath' in resolved)) {
      res.writeHead(resolved.status, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(resolved.status === 404 ? 'Not Found' : resolved.status === 403 ? 'Forbidden' : 'Bad Request')
      return
    }

    const body = await readFile(resolved.absolutePath)
    res.writeHead(200, {
      'Content-Type': resolveContentType(resolved.absolutePath),
      'Content-Length': body.length,
      'Cache-Control': resolveCacheControl(resolved.absolutePath),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
    })

    if (method === 'HEAD') {
      res.end()
      return
    }

    res.end(body)
  } catch {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    }
    res.end('500')
  }
})

server.listen(port, () => {
  const root = basePath === '/' ? '' : basePath
  console.log(`[serve-static] Serving ${outDir} at http://localhost:${port}${root}/`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0))
  })
}
