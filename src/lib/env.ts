function normalizeBasePath(value: string | undefined): string {
  if (!value || value === '/') return ''
  const trimmed = value.trim().replace(/^\/+/, '').replace(/\/+$/, '')
  return trimmed ? `/${trimmed}` : ''
}

export const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH)
