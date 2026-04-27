let _idCounter = 0

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${(_idCounter++).toString(36)}-${Math.random().toString(36).slice(2)}`
}
