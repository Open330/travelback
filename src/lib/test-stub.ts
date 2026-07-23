/**
 * Developer-only export test stub for E2E testing.
 *
 * When enabled on localhost, the export pipeline bypasses real video encoding
 * and returns the canonical text payload below. This avoids slow real-encoding in CI
 * while still exercising the export UI flow.
 *
 * Enable:  localStorage.setItem('travelback-export-test-stub', '1')
 * Disable: localStorage.removeItem('travelback-export-test-stub')
 */
export const LOCAL_EXPORT_TEST_STUB_PAYLOAD = 'travelback-test-export'
export const LOCAL_EXPORT_TEST_STUB_BYTE_LENGTH = new TextEncoder()
  .encode(LOCAL_EXPORT_TEST_STUB_PAYLOAD).byteLength

export function isLocalExportTestStubEnabled(): boolean {
  if (typeof window === 'undefined') return false
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  if (!isLocalHost) return false
  try {
    const enabled = window.localStorage.getItem('travelback-export-test-stub') === '1'
    if (enabled) {
      console.warn(`[Travelback] Export test stub is active — exports will produce ${LOCAL_EXPORT_TEST_STUB_BYTE_LENGTH}-byte stub files instead of real video. Disable by removing localStorage key "travelback-export-test-stub".`)
    }
    return enabled
  } catch {
    return false
  }
}

/** Opt-in companion for browser tests that need one real MapView frame
 * mutation while still bypassing video encoding. */
export function shouldRenderLocalExportTestFrame(): boolean {
  if (typeof window === 'undefined') return false
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  if (!isLocalHost) return false
  try {
    return window.localStorage.getItem('travelback-export-frame-test') === '1'
  } catch {
    return false
  }
}
