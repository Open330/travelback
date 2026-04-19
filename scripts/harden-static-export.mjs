import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

const outDir = path.resolve(process.cwd(), 'out')
const htmlFiles = []

const STYLE_POLICY = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src __SCRIPT_HASHES__",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' blob: data: https://*.basemaps.cartocdn.com",
  "connect-src 'self' https://*.basemaps.cartocdn.com",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "media-src 'self' blob:",
  'upgrade-insecure-requests',
].join('; ')

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      await walk(absolutePath)
      continue
    }

    if (entry.isFile() && absolutePath.endsWith('.html')) {
      htmlFiles.push(absolutePath)
    }
  }
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
}

function computeScriptHashes(html) {
  const hashes = new Set()
  const scriptPattern = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi

  for (const match of html.matchAll(scriptPattern)) {
    const scriptContent = decodeHtmlEntities(match[1])
    if (!scriptContent || scriptContent.trim() === '') continue
    const hash = crypto.createHash('sha256').update(scriptContent, 'utf8').digest('base64')
    hashes.add(`'sha256-${hash}'`)
  }

  return [...hashes].sort()
}

function replaceCspMeta(html, csp) {
  const contentAttribute = csp.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  // Single regex handles attributes in any order with either quote style
  const CSP_META_REGEX = /<meta\s+[^>]*http-equiv=(?:"Content-Security-Policy"|'Content-Security-Policy')[^>]*>/i
  const match = html.match(CSP_META_REGEX)
  if (!match) return html
  return html.replace(
    CSP_META_REGEX,
    `<meta http-equiv="Content-Security-Policy" data-travelback-csp="static-export" content="${contentAttribute}"/>`,
  )
}

await stat(outDir)
await walk(outDir)

if (htmlFiles.length === 0) {
  throw new Error(`No static HTML files found in ${outDir}`)
}

for (const htmlFile of htmlFiles) {
  const html = await readFile(htmlFile, 'utf8')
  const hashes = computeScriptHashes(html)
  const scriptSrc = hashes.length > 0
    ? [`'self'`, ...hashes].join(' ')
    : "'self'"

  const csp = STYLE_POLICY.replace('__SCRIPT_HASHES__', scriptSrc)
  const nextHtml = replaceCspMeta(html, csp)
  if (nextHtml === html) {
    throw new Error(`CSP meta tag not found or not replaced in ${htmlFile}`)
  }
  await writeFile(htmlFile, nextHtml)
}

console.log(`[harden-static-export] Hardened CSP across ${htmlFiles.length} HTML file(s)`)
