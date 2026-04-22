# Debugger — Cycle 3 (2026-04-23)

## Findings

### C3-F1 (confirm). Worker segment filter bug — active code path
- **Severity**: HIGH | **Confidence**: HIGH
- **File**: `public/workers/trackParser.worker.js:200`
- **Issue**: Confirmed the `.filter(idx => idx > 0)` bug is live in the worker. This is the PRIMARY code path for Google Location History parsing (the worker is used when `typeof Worker !== 'undefined'`, which is true in all modern browsers). The main-thread parser was fixed in cycle 2, but the worker was missed. This means the fix from cycle 2 only applies to the fallback path (no Worker support), not the primary path.
- **Latent bug surface**: The worker is a standalone JS file that duplicates parser logic. Any future parser fix must be applied in both places. This is a maintainability risk.

### C3-F3. Worker missing ParseError class and error code mapping
- **Severity**: MEDIUM | **Confidence**: HIGH
- **File**: `public/workers/trackParser.worker.js:258-267`
- **Issue**: The worker maps error messages to codes using string matching (`message.includes(...)`), while the main-thread parser uses a proper `ParseError` class with explicit codes. This is fragile — if error messages change in the main-thread parser, the worker's string matching will break silently, causing all worker errors to fall through to `'INVALID_GOOGLE_JSON'`. The main-thread parser uses `throw new ParseError('Unsupported Google Location History format', 'UNSUPPORTED_GOOGLE_FORMAT')` but the worker checks `message.includes('Unsupported Google Location History format')`.
- **Fix**: Consider defining error codes as constants shared between the worker and main-thread code, or restructuring the worker to return structured error objects with codes rather than relying on message string matching.

### C3-F4. Worker `data.slice(0, 100)` may miss valid records
- **Severity**: LOW | **Confidence**: MEDIUM
- **File**: `public/workers/trackParser.worker.js:145`
- **Issue**: Same as main-thread parser. The format detection for flat arrays uses `data.slice(0, 100).some(looksLikeGoogleLocationRecord)`. If the first 100 records of a flat array don't contain valid location records (e.g., they contain metadata objects), the format won't be detected. This is consistent with the main-thread behavior and unlikely to occur in practice.
