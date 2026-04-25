import type { NextConfig } from 'next'

function normalizeBasePath(value: string | undefined, fallback: string): string {
  const raw = value ?? fallback
  if (!raw || raw === '/') return ''
  const trimmed = raw.trim().replace(/^\/+/, '').replace(/\/+$/, '')
  return trimmed ? `/${trimmed}` : ''
}

const defaultBasePath = process.env.NODE_ENV === 'production' ? '/travelback' : ''
const basePath = normalizeBasePath(
  process.env.TRAVELBACK_BASE_PATH ?? process.env.NEXT_PUBLIC_BASE_PATH,
  defaultBasePath,
)

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
