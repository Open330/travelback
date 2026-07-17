import { normalizeBasePath } from './base-path.mjs'

export const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH)
