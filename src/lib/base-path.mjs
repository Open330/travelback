/**
 * Normalize a static mount path for both build-time and browser consumers.
 * Root is represented as an empty prefix; server CLIs may translate it to `/`.
 *
 * @param {string | undefined} value
 * @returns {string}
 */
export function normalizeBasePath(value) {
  const raw = value?.trim() ?? ''
  if (!raw || raw === '/') return ''

  const trimmed = raw.replace(/^\/+/, '').replace(/\/+$/, '')
  if (!trimmed) return ''

  const hasDotSegment = trimmed.split('/').some(segment => {
    let decodedSegment = segment
    try {
      decodedSegment = decodeURIComponent(segment)
    } catch {
      throw new Error(`Invalid base path "${value}": malformed percent-encoding`)
    }
    return decodedSegment === '.' || decodedSegment === '..'
  })

  if (hasDotSegment) {
    throw new Error(`Invalid base path "${value}": "." and ".." segments are not allowed`)
  }

  return `/${trimmed}`
}
