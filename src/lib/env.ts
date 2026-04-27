function normalizeBasePath(value: string | undefined): string {
  if (!value || value === '/') return ''
  const trimmed = value.trim().replace(/^\/+/, '').replace(/\/+$/, '')
  // Defense-in-depth: reject path traversal attempts
  if (trimmed.includes('..')) return ''
  return trimmed ? `/${trimmed}` : ''
}

export const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH)
