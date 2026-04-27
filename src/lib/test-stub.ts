/**
 * Developer-only export test stub for E2E testing.
 *
 * When enabled on localhost, the export pipeline bypasses real video encoding
 * and returns a 26-byte stub file. This avoids slow real-encoding in CI
 * while still exercising the export UI flow.
 *
 * Enable:  localStorage.setItem('travelback-export-test-stub', '1')
 * Disable: localStorage.removeItem('travelback-export-test-stub')
 */
export function isLocalExportTestStubEnabled(): boolean {
  if (typeof window === 'undefined') return false
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  if (!isLocalHost) return false
  try {
    const enabled = window.localStorage.getItem('travelback-export-test-stub') === '1'
    if (enabled) {
      console.warn('[Travelback] Export test stub is active — exports will produce 26-byte stub files instead of real video. Disable by removing localStorage key "travelback-export-test-stub".')
    }
    return enabled
  } catch {
    return false
  }
}
