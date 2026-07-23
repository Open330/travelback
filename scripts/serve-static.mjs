import { createServer } from 'node:http'
import { constants } from 'node:fs'
import { open, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { normalizeBasePath } from '../src/lib/base-path.mjs'

export const DEFAULT_STATIC_HOST = '127.0.0.1'

const NO_FOLLOW_FLAG = typeof constants.O_NOFOLLOW === 'number'
  ? constants.O_NOFOLLOW
  : 0

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

function isInside(parent, child) {
  return child === parent || child.startsWith(`${parent}${path.sep}`)
}

function resolveContentType(filePath) {
  return mimeTypes.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream'
}

function resolveCacheControl(filePath, realOutputRoot) {
  const relativePath = path.relative(realOutputRoot, filePath).split(path.sep).join('/')
  if (relativePath.endsWith('.html')) return 'no-cache'
  if (relativePath.startsWith('_next/static/')) return 'public, max-age=31536000, immutable'
  if (relativePath.startsWith('workers/') || relativePath.startsWith('map-styles/')) return 'no-cache, must-revalidate'
  return 'public, max-age=3600'
}

function errorCode(error) {
  return error && typeof error === 'object' && 'code' in error
    ? error.code
    : undefined
}

function pathErrorStatus(error) {
  const code = errorCode(error)
  if (code === 'ELOOP' || code === 'EACCES' || code === 'EPERM') return 403
  return 404
}

async function inspectCandidate(candidatePath, realOutputRoot) {
  try {
    const candidateRealPath = await realpath(candidatePath)
    if (!isInside(realOutputRoot, candidateRealPath)) {
      return { status: 403 }
    }

    return {
      status: 200,
      candidateRealPath,
      stats: await stat(candidateRealPath),
    }
  } catch (error) {
    return { status: pathErrorStatus(error) }
  }
}

/**
 * Open the requested path once, verify that the descriptor still identifies
 * the canonical in-root file, then return that descriptor for streaming.
 * O_NOFOLLOW rejects a final symlink on platforms that expose it. The
 * post-open realpath + device/inode comparison also closes the race window
 * for platforms without O_NOFOLLOW and for swapped intermediate symlinks.
 */
async function openValidatedFile(candidatePath, realOutputRoot) {
  let fileHandle
  try {
    fileHandle = await open(candidatePath, constants.O_RDONLY | NO_FOLLOW_FLAG)
  } catch (error) {
    return { status: pathErrorStatus(error) }
  }

  let keepOpen = false
  try {
    const openedStats = await fileHandle.stat({ bigint: true })
    if (!openedStats.isFile()) {
      return { status: 404 }
    }

    const candidateRealPath = await realpath(candidatePath)
    if (!isInside(realOutputRoot, candidateRealPath)) {
      return { status: 403 }
    }

    const currentStats = await stat(candidateRealPath, { bigint: true })
    if (
      !currentStats.isFile()
      || openedStats.dev !== currentStats.dev
      || openedStats.ino !== currentStats.ino
    ) {
      return { status: 403 }
    }

    keepOpen = true
    return {
      status: 200,
      fileHandle,
      realPath: candidateRealPath,
      size: openedStats.size.toString(),
    }
  } catch (error) {
    return { status: pathErrorStatus(error) }
  } finally {
    if (!keepOpen) {
      await fileHandle.close().catch(() => {})
    }
  }
}

function createFileResolver(outputRoot, realOutputRoot, configuredBasePath) {
  return async function resolveFile(requestPathname) {
    let urlPathname = requestPathname
    if (configuredBasePath !== '/') {
      if (urlPathname === '/' || urlPathname === '' || urlPathname === configuredBasePath) {
        return { redirect: `${configuredBasePath}/` }
      }

      if (!urlPathname.startsWith(`${configuredBasePath}/`)) {
        return { status: 404 }
      }

      urlPathname = urlPathname.slice(configuredBasePath.length)
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
    let candidatePath = path.resolve(outputRoot, requestedPath)
    if (!isInside(outputRoot, candidatePath)) {
      return { status: 403 }
    }

    let inspected = await inspectCandidate(candidatePath, realOutputRoot)
    if (inspected.status !== 200 || !('stats' in inspected)) {
      return { status: inspected.status }
    }

    if (inspected.stats.isDirectory()) {
      candidatePath = path.join(candidatePath, 'index.html')
      inspected = await inspectCandidate(candidatePath, realOutputRoot)
      if (inspected.status !== 200 || !('stats' in inspected)) {
        return { status: inspected.status }
      }
    }

    if (!inspected.stats.isFile()) {
      return { status: 404 }
    }

    return openValidatedFile(candidatePath, realOutputRoot)
  }
}

export async function createStaticFileServer({
  outputDirectory = path.resolve(process.cwd(), 'out'),
  basePath = '/travelback',
} = {}) {
  const outputRoot = path.resolve(outputDirectory)
  const realOutputRoot = await realpath(outputRoot)
  const rootStats = await stat(realOutputRoot)
  if (!rootStats.isDirectory()) {
    throw new Error(`Static output root is not a directory: ${outputRoot}`)
  }

  const configuredBasePath = normalizeBasePath(basePath) || '/'
  const resolveFile = createFileResolver(outputRoot, realOutputRoot, configuredBasePath)

  return createServer((req, res) => {
    void (async () => {
      const method = req.method ?? 'GET'
      if (method !== 'GET' && method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('Method Not Allowed')
        return
      }

      let fileHandle
      try {
        const requestUrl = new URL(req.url ?? '/', 'http://127.0.0.1')
        const resolved = await resolveFile(requestUrl.pathname)

        if ('redirect' in resolved) {
          res.writeHead(302, { Location: resolved.redirect })
          res.end()
          return
        }

        if (resolved.status !== 200 || !('fileHandle' in resolved)) {
          res.writeHead(resolved.status, { 'Content-Type': 'text/plain; charset=utf-8' })
          res.end(resolved.status === 404 ? 'Not Found' : resolved.status === 403 ? 'Forbidden' : 'Bad Request')
          return
        }

        fileHandle = resolved.fileHandle
        res.writeHead(200, {
          'Content-Type': resolveContentType(resolved.realPath),
          'Content-Length': resolved.size,
          'Cache-Control': resolveCacheControl(resolved.realPath, realOutputRoot),
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Referrer-Policy': 'no-referrer',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Resource-Policy': 'same-origin',
        })

        if (method === 'HEAD') {
          res.end()
          return
        }

        await pipeline(
          fileHandle.createReadStream({ autoClose: false }),
          res,
        )
      } catch {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
          res.end('500')
        } else if (!res.destroyed) {
          res.destroy()
        }
      } finally {
        if (fileHandle) {
          await fileHandle.close().catch(() => {})
        }
      }
    })()
  })
}

export async function startStaticFileServer({
  outputDirectory = path.resolve(process.cwd(), 'out'),
  basePath = '/travelback',
  port = 3000,
  host = DEFAULT_STATIC_HOST,
} = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error(`Invalid port: ${port}`)
  }
  if (typeof host !== 'string' || host.trim() === '') {
    throw new Error(`Invalid host: ${host}`)
  }

  const server = await createStaticFileServer({ outputDirectory, basePath })
  await new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening)
      reject(error)
    }
    const onListening = () => {
      server.off('error', onError)
      resolve()
    }
    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(port, host)
  })
  return server
}

function readArg(args, name, fallback) {
  const index = args.indexOf(`--${name}`)
  if (index === -1) return fallback
  return args[index + 1] ?? fallback
}

function urlHost(host) {
  return host.includes(':') && !host.startsWith('[') ? `[${host}]` : host
}

async function runCli() {
  const args = process.argv.slice(2)
  const outputDirectory = path.resolve(process.cwd(), 'out')
  const port = Number(readArg(args, 'port', process.env.PORT ?? '3000'))
  const host = readArg(
    args,
    'host',
    process.env.TRAVELBACK_STATIC_HOST ?? DEFAULT_STATIC_HOST,
  )
  const basePath = normalizeBasePath(readArg(
    args,
    'base-path',
    process.env.TRAVELBACK_BASE_PATH ?? process.env.STATIC_BASE_PATH ?? '/travelback',
  )) || '/'

  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    console.error(`[serve-static] Invalid port: ${port}`)
    process.exitCode = 1
    return
  }
  if (typeof host !== 'string' || host.trim() === '') {
    console.error(`[serve-static] Invalid host: ${host}`)
    process.exitCode = 1
    return
  }

  let server
  try {
    server = await startStaticFileServer({
      outputDirectory,
      basePath,
      port,
      host,
    })
  } catch (error) {
    if (errorCode(error) === 'ENOENT' || errorCode(error) === 'ENOTDIR') {
      console.error('[serve-static] Missing ./out directory. Run `npm run build` first.')
    } else {
      console.error('[serve-static] Failed to start:', error instanceof Error ? error.message : String(error))
    }
    process.exitCode = 1
    return
  }

  const root = basePath === '/' ? '' : basePath
  console.log(`[serve-static] Serving ${outputDirectory} at http://${urlHost(host)}:${port}${root}/`)

  let closing = false
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      if (closing) return
      closing = true
      server.close(() => {
        process.exitCode = 0
      })
    })
  }
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  await runCli()
}
