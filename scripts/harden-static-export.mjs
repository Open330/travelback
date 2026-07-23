import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

// Match the CSP <meta> tag injected by Next.js so we can replace it with a
// hardened version containing SHA-256 hashes of all inline scripts.
const CSP_META_REGEX = /<meta\s+[^>]*http-equiv=(?:"Content-Security-Policy"|'Content-Security-Policy')[^>]*>/i
const ACTIVE_HEAD_CONTENT_REGEX = /<(?:script|style)\b|<link\b[^>]*\brel\s*=\s*(?:"[^"]*\b(?:stylesheet|modulepreload|preload)\b[^"]*"|'[^']*\b(?:stylesheet|modulepreload|preload)\b[^']*')/i

// `frame-ancestors` intentionally omitted from the meta CSP: the directive is
// header-only per the CSP spec (https://www.w3.org/TR/CSP3/#frame-ancestors)
// and Chromium/Firefox emit a console error when it is delivered via <meta>.
// Anti-framing is enforced instead by (1) the JS frame-buster in layout.tsx
// and (2) the host-level response header documented in
// .context/project/02-architecture.md.
const STYLE_POLICY = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "form-action 'self'",
  "script-src __SCRIPT_HASHES__",
  "script-src-attr 'none'",
  'style-src __STYLE_HASHES__',
  'style-src-elem __STYLE_HASHES__',
  "style-src-attr 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' blob: data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "media-src 'self' blob:",
  'upgrade-insecure-requests',
].join('; ')

/** Recursively find all .html files under the output directory. */
async function walk(directory, htmlFiles) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      await walk(absolutePath, htmlFiles)
      continue
    }

    if (entry.isFile() && absolutePath.endsWith('.html')) {
      htmlFiles.push(absolutePath)
    }
  }
}

/**
 * Decode the entities used in a quoted HTML attribute. This is intentionally
 * limited to attribute inspection: script elements are raw-text elements, so
 * entity-shaped text in a script body must remain literal for CSP hashing.
 */
function decodeHtmlAttributeEntities(text) {
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

/**
 * Find all inline (non-src) <script> elements in the HTML and compute
 * SHA-256 hashes of their exact serialized bodies. Script elements are
 * raw-text elements: browsers do not decode `&amp;`, numeric references, or
 * other entity-shaped source text before applying CSP's inline check.
 */
export function computeScriptHashes(html) {
  const hashes = new Set()
  const scriptPattern = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi

  for (const match of html.matchAll(scriptPattern)) {
    const scriptContent = match[1]
    if (!scriptContent || scriptContent.trim() === '') continue
    const hash = crypto.createHash('sha256').update(scriptContent, 'utf8').digest('base64')
    hashes.add(`'sha256-${hash}'`)
  }

  return [...hashes].sort()
}

/**
 * Hash nonempty inline <style> blocks exactly as serialized. Style elements
 * are raw-text elements, so their text is not HTML-entity decoded before the
 * browser performs the CSP inline check.
 */
function computeStyleHashes(html) {
  const hashes = new Set()
  const stylePattern = /<style\b[^>]*>([\s\S]*?)<\/style>/gi

  for (const match of html.matchAll(stylePattern)) {
    const styleContent = match[1]
    if (!styleContent || styleContent.trim() === '') continue
    const hash = crypto.createHash('sha256').update(styleContent, 'utf8').digest('base64')
    hashes.add(`'sha256-${hash}'`)
  }

  return [...hashes].sort()
}

/**
 * Rewrite Next.js's inline <script> that contains the travelback-bootstrap payload
 * from the obfuscated `self.__next_s.push([...])` form to a plain <script id="travelback-bootstrap">
 * form. This is required because CSP hash computation needs to find the script content
 * in a stable, parseable location — the `__next_s.push` wrapper is not a direct <script> body
 * and would not be picked up by the SHA-256 extraction loop above.
 *
 * The regex matches the repository's current static-export output shape, guarded by
 * the fail-closed build check below and the static smoke assertions:
 *   <script>(self.__next_s=self.__next_s||[]).push([0,{"children":"...","id":"travelback-bootstrap"}])</script>
 *
 * If Next.js changes how it serializes inline scripts (e.g., adding whitespace around the
 * push call, changing attribute order in the JSON, using different encoding), this regex
 * will silently fail to match. The `hasBootstrap && !replaced` check below catches this
 * case and throws at build time.
 */
function inlineTravelbackBootstrap(html) {
  const nextScriptPattern = /<script>\(self\.__next_s=self\.__next_s\|\|\[\]\)\.push\(\[0,(\{"children":"(?:\\.|[^"\\])*","id":"travelback-bootstrap"\})\]\)<\/script>/i
  const hasBootstrap = /travelback-bootstrap/.test(html)
  let replaced = false

  const result = html.replace(nextScriptPattern, (_, payload) => {
    const { children } = JSON.parse(payload)
    if (typeof children !== 'string' || children.trim() === '') {
      throw new Error('Travelback bootstrap script payload is empty')
    }
    replaced = true
    return `<script id="travelback-bootstrap">${children}</script>`
  })

  if (hasBootstrap && !replaced) {
    throw new Error('travelback-bootstrap payload found in HTML but regex did not match — Next.js output shape may have changed')
  }

  return result
}

/** Replace and relocate the placeholder CSP to the first position in <head>. */
function replaceCspMeta(html, csp) {
  const contentAttribute = csp.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  const globalCspMetaRegex = new RegExp(CSP_META_REGEX.source, 'gi')
  const matches = html.match(globalCspMetaRegex) ?? []
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one CSP meta tag, found ${matches.length}`)
  }

  const headMatch = html.match(/<head(?:\s[^>]*)?>/i)
  if (!headMatch) {
    throw new Error('Static HTML is missing a <head> element')
  }

  const cspMeta = `<meta http-equiv="Content-Security-Policy" data-travelback-csp="static-export" content="${contentAttribute}"/>`
  const withoutCsp = html.replace(globalCspMetaRegex, '')
  return withoutCsp.replace(headMatch[0], `${headMatch[0]}${cspMeta}`)
}

/**
 * Safety check: verify the CSP meta tag was actually replaced (not left as
 * a placeholder or with 'unsafe-inline'). Throws at build time if the
 * hardening did not take effect, preventing deployment of weak CSP.
 */
function assertStaticCspMeta(html, htmlFile) {
  const matches = html.match(new RegExp(CSP_META_REGEX.source, 'gi')) ?? []
  if (matches.length !== 1) {
    throw new Error(`Expected one hardened CSP meta tag in ${htmlFile}, found ${matches.length}`)
  }

  const cspMeta = decodeHtmlAttributeEntities(matches[0])
  if (
    cspMeta.includes('data-travelback-csp="placeholder"')
    || cspMeta.includes("script-src 'self' 'unsafe-inline'")
    || cspMeta.includes('__STYLE_HASHES__')
  ) {
    throw new Error(`Refusing to publish HTML with placeholder script CSP in ${htmlFile}`)
  }

  const head = html.match(/<head(?:\s[^>]*)?>([\s\S]*?)<\/head>/i)
  if (!head) {
    throw new Error(`Static HTML is missing a complete <head> element in ${htmlFile}`)
  }

  const cspIndex = head[1].search(CSP_META_REGEX)
  const activeContentIndex = head[1].search(ACTIVE_HEAD_CONTENT_REGEX)
  if (cspIndex < 0 || (activeContentIndex >= 0 && cspIndex > activeContentIndex)) {
    throw new Error(`CSP meta must precede active head content in ${htmlFile}`)
  }
}

export async function hardenStaticExport(outDir = path.resolve(process.cwd(), 'out')) {
  const htmlFiles = []
  await stat(outDir)
  await walk(outDir, htmlFiles)

  if (htmlFiles.length === 0) {
    throw new Error(`No static HTML files found in ${outDir}`)
  }

  for (const htmlFile of htmlFiles) {
    const html = inlineTravelbackBootstrap(await readFile(htmlFile, 'utf8'))
    const hashes = computeScriptHashes(html)
    const scriptSrc = hashes.length > 0
      ? [`'self'`, ...hashes].join(' ')
      : "'self'"

    const styleHashes = computeStyleHashes(html)
    const styleSrc = styleHashes.length > 0
      ? [`'self'`, ...styleHashes].join(' ')
      : "'self'"

    const csp = STYLE_POLICY
      .replace('__SCRIPT_HASHES__', scriptSrc)
      .replaceAll('__STYLE_HASHES__', styleSrc)
    const nextHtml = replaceCspMeta(html, csp)
    if (nextHtml === html) {
      throw new Error(`CSP meta tag not found or not replaced in ${htmlFile}`)
    }
    assertStaticCspMeta(nextHtml, htmlFile)
    await writeFile(htmlFile, nextHtml)
  }

  console.log(`[harden-static-export] Hardened CSP across ${htmlFiles.length} HTML file(s)`)
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  await hardenStaticExport()
}
