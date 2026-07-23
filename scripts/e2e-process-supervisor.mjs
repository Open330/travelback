import { execFile, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createServer as createTcpServer } from 'node:net'
import path from 'node:path'

const FORWARDED_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT']
const OWNERSHIP_ENVIRONMENT_KEY = 'TRAVELBACK_E2E_OWNER'
const TRAVELBACK_MARKER = /\bdata-svc=(['"])travelback\1/i
const MARKER_READ_LIMIT = 64 * 1024
const PROCESS_TABLE_TIMEOUT_MS = 2_000
const PROCESS_TABLE_MAX_BUFFER = 64 * 1024 * 1024
const CLEANUP_POLL_INTERVAL_MS = 50
export const POSIX_OWNERSHIP_POLL_INTERVAL_MS = 5_000

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function isMissingProcessError(error) {
  return error && typeof error === 'object' && 'code' in error && error.code === 'ESRCH'
}

function isProcessAlive(pid) {
  if (!pid) return false

  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    if (isMissingProcessError(error)) return false
    throw error
  }
}

export class UnsupportedProcessContainmentError extends Error {
  constructor(message) {
    super(message)
    this.name = 'UnsupportedProcessContainmentError'
  }
}

function parsePosixProcessTable(stdout, ownershipMarker) {
  const snapshot = new Map()
  for (const line of stdout.split('\n')) {
    const match = line.trimEnd().match(
      /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.{24})(?:\s+(.*))?$/,
    )
    if (!match) continue
    const commandAndEnvironment = match[5] ?? ''
    const entry = {
      pid: Number(match[1]),
      ppid: Number(match[2]),
      pgid: Number(match[3]),
      startedAt: match[4],
      owned: commandAndEnvironment.includes(ownershipMarker),
    }
    snapshot.set(entry.pid, entry)
  }
  return snapshot
}

function runPosixProcessSnapshot(args, ownershipMarker) {
  return new Promise((resolve, reject) => {
    execFile(
      'ps',
      args,
      {
        encoding: 'utf8',
        env: { ...process.env, LC_ALL: 'C' },
        maxBuffer: PROCESS_TABLE_MAX_BUFFER,
        timeout: PROCESS_TABLE_TIMEOUT_MS,
        killSignal: 'SIGKILL',
      },
      (error, stdout) => {
        if (error) {
          reject(error)
          return
        }

        resolve(parsePosixProcessTable(stdout, ownershipMarker))
      },
    )
  })
}

function readPosixProcessTable(ownershipMarker) {
  return runPosixProcessSnapshot(
    ['-AxwwE', '-o', 'pid=,ppid=,pgid=,lstart=,command='],
    ownershipMarker,
  )
}

async function readPosixProcessIdentities(pids, ownershipMarker) {
  if (pids.length === 0) return new Map()

  const snapshots = await Promise.all(
    Array.from({ length: Math.ceil(pids.length / 128) }, (_, index) => {
      const chunk = pids.slice(index * 128, (index + 1) * 128)
      return runPosixProcessSnapshot(
        ['-p', chunk.join(','), '-wwE', '-o', 'pid=,ppid=,pgid=,lstart=,command='],
        ownershipMarker,
      )
    }),
  )
  return new Map(snapshots.flatMap(snapshot => [...snapshot]))
}

function processIdentity(entry) {
  return `${entry.pid}:${entry.startedAt}`
}

function sameProcessIdentity(left, right) {
  return left.pid === right.pid
    && left.startedAt === right.startedAt
    && left.owned
    && right.owned
}

export class PosixOwnedProcessTracker {
  constructor(rootPid, ownershipMarker, {
    readSnapshot,
    readIdentities,
    signalProcess,
    now,
    wait,
    setIntervalFn,
    clearIntervalFn,
    pollIntervalMs = POSIX_OWNERSHIP_POLL_INTERVAL_MS,
    wrapperPid = process.pid,
  } = {}) {
    this.rootPid = rootPid
    this.ownershipMarker = ownershipMarker
    this.readSnapshot = readSnapshot ?? (() => readPosixProcessTable(this.ownershipMarker))
    this.readIdentities = readIdentities
      ?? (pids => readPosixProcessIdentities(pids, this.ownershipMarker))
    this.signalProcess = signalProcess ?? ((pid, signal) => process.kill(pid, signal))
    this.now = now ?? Date.now
    this.wait = wait ?? delay
    this.setIntervalFn = setIntervalFn ?? setInterval
    this.clearIntervalFn = clearIntervalFn ?? clearInterval
    this.pollIntervalMs = pollIntervalMs
    this.wrapperPid = wrapperPid
    this.lastValidatedProcesses = new Map()
    this.sentSignals = new Set()
    this.refreshPromise = null
    this.pollTimer = null
    this.wrapperPgid = null
    this.snapshotError = null
    this.operationError = null
  }

  async start() {
    await this.refresh()
    this.pollTimer = this.setIntervalFn(() => {
      this.refresh().catch(error => {
        this.rememberSnapshotError(error)
      })
    }, this.pollIntervalMs)
    this.pollTimer?.unref?.()
  }

  stop() {
    if (this.pollTimer) this.clearIntervalFn(this.pollTimer)
    this.pollTimer = null
  }

  refresh() {
    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshNow().finally(() => {
        this.refreshPromise = null
      })
    }
    return this.refreshPromise
  }

  async refreshNow() {
    const snapshot = await this.readSnapshot()
    this.wrapperPgid = snapshot.get(this.wrapperPid)?.pgid ?? this.wrapperPgid

    const liveProcesses = []
    for (const current of snapshot.values()) {
      if (!current.owned) continue
      this.assertSafeIdentity(current)
      liveProcesses.push(current)
    }

    this.lastValidatedProcesses = new Map(
      liveProcesses.map(entry => [processIdentity(entry), entry]),
    )
    return liveProcesses
  }

  assertSafeIdentity(entry) {
    if (
      !Number.isSafeInteger(entry.pid)
      || entry.pid <= 1
      || entry.pid === this.wrapperPid
    ) {
      throw new Error(`Refusing to signal unsafe owned PID ${entry.pid}`)
    }

    if (!Number.isSafeInteger(entry.pgid) || entry.pgid <= 1) {
      throw new Error(`Refusing to act on owned PID ${entry.pid} in unsafe process group ${entry.pgid}`)
    }

    if (this.wrapperPgid && entry.pgid === this.wrapperPgid) {
      throw new Error(
        `Refusing to act on owned PID ${entry.pid} in wrapper process group ${entry.pgid}`,
      )
    }
  }

  rememberSnapshotError(error) {
    this.snapshotError ??= error
  }

  rememberOperationError(error) {
    this.operationError ??= error
  }

  async readValidatedCache() {
    const liveProcesses = []
    let snapshot
    try {
      snapshot = await this.readIdentities(
        [...this.lastValidatedProcesses.values()].map(entry => entry.pid),
      )
    } catch (error) {
      this.rememberOperationError(error)
      return liveProcesses
    }

    for (const cached of this.lastValidatedProcesses.values()) {
      try {
        const current = snapshot.get(cached.pid)
        if (!current || !sameProcessIdentity(cached, current)) continue
        this.assertSafeIdentity(current)
        liveProcesses.push(current)
      } catch (error) {
        this.rememberOperationError(error)
      }
    }

    return liveProcesses
  }

  async observeForCleanup() {
    try {
      return {
        completeSnapshot: true,
        liveProcesses: await this.refresh(),
      }
    } catch (error) {
      this.rememberSnapshotError(error)
      return {
        completeSnapshot: false,
        liveProcesses: await this.readValidatedCache(),
      }
    }
  }

  signalProcessesOnce(liveProcesses, signal) {
    for (const entry of liveProcesses) {
      const signalKey = `${processIdentity(entry)}:${signal}`
      if (this.sentSignals.has(signalKey)) continue

      try {
        this.signalProcess(entry.pid, signal)
      } catch (error) {
        if (!isMissingProcessError(error)) this.rememberOperationError(error)
      }
      this.sentSignals.add(signalKey)
    }
  }

  async signalAndWait(signal, timeoutMs) {
    const deadline = this.now() + timeoutMs
    while (true) {
      const observation = await this.observeForCleanup()
      if (observation.completeSnapshot && observation.liveProcesses.length === 0) return true
      this.signalProcessesOnce(observation.liveProcesses, signal)
      if (this.now() >= deadline) return false
      await this.wait(CLEANUP_POLL_INTERVAL_MS)
    }
  }

  cleanupError() {
    return this.snapshotError ?? this.operationError
  }

  describe() {
    return `owned E2E processes for run rooted at PID ${this.rootPid}`
  }
}

export async function stopOwnedProcessTree(
  tracker,
  initialSignal,
  gracePeriodMs,
  forceKillWaitMs,
) {
  let stopped = await tracker.signalAndWait(initialSignal, gracePeriodMs)
  if (!stopped) {
    stopped = await tracker.signalAndWait('SIGKILL', forceKillWaitMs)
  }

  const cleanupError = tracker.cleanupError?.()
  if (cleanupError) {
    throw new Error(
      `Cleanup of ${tracker.describe()} could not be fully verified: ${cleanupError.message}`,
      { cause: cleanupError },
    )
  }
  if (!stopped) throw new Error(`${tracker.describe()} survived forced termination`)
}

async function forceRootGroupExitAfterTrackingFailure(child, platform) {
  if (!child.pid) return
  if (platform === 'win32') {
    child.kill('SIGKILL')
    return
  }
  try {
    process.kill(-child.pid, 'SIGKILL')
  } catch (error) {
    if (!isMissingProcessError(error)) throw error
  }
}

function waitForChildOutcome(child) {
  return new Promise(resolve => {
    child.once('error', error => resolve({ error }))
    child.once('exit', (code, signal) => resolve({ code, signal }))
  })
}

async function verifyPosixOwnershipBoundary(ownershipMarker, childEnvironment) {
  const probe = spawn(
    process.execPath,
    ['-e', 'setTimeout(() => {}, 30_000)'],
    {
      env: childEnvironment,
      stdio: 'ignore',
      windowsHide: true,
    },
  )
  const probeOutcome = waitForChildOutcome(probe)

  try {
    await new Promise((resolve, reject) => {
      probe.once('spawn', resolve)
      probe.once('error', reject)
    })
    const snapshot = await readPosixProcessTable(ownershipMarker)
    if (!snapshot.get(probe.pid)?.owned) {
      throw new UnsupportedProcessContainmentError(
        'This platform does not expose inherited E2E ownership identities; refusing to launch without complete-tree cleanup',
      )
    }
  } finally {
    if (probe.pid && isProcessAlive(probe.pid)) {
      try {
        process.kill(probe.pid, 'SIGKILL')
      } catch (error) {
        if (!isMissingProcessError(error)) throw error
      }
    }
    const outcome = await Promise.race([
      probeOutcome,
      delay(1_000).then(() => null),
    ])
    if (!outcome) {
      throw new Error(`Ownership-boundary probe PID ${probe.pid} survived exact cleanup`)
    }
  }
}

/**
 * Establishes an inherited run identity before launch, then supervises every
 * process that retains that identity even after reparenting or changing
 * process groups. Cleanup targets validated PID/start identities individually.
 */
export async function runSupervisedProcess(command, args, {
  cwd = process.cwd(),
  env = process.env,
  stdio = 'inherit',
  gracePeriodMs = 5_000,
  forceKillWaitMs = 2_000,
  processOperations = {},
} = {}) {
  const platform = processOperations.platform ?? process.platform
  if (platform === 'win32' && !processOperations.createTracker) {
    return {
      error: new UnsupportedProcessContainmentError(
        'Windows E2E supervision requires a Job Object containment provider; refusing to infer complete-tree cleanup from root-PID death',
      ),
    }
  }

  const ownershipValue = (
    processOperations.createOwnershipValue?.()
    ?? randomBytes(24).toString('hex')
  )
  const ownershipMarker = `${OWNERSHIP_ENVIRONMENT_KEY}=${ownershipValue}`
  const childEnvironment = {
    ...env,
    [OWNERSHIP_ENVIRONMENT_KEY]: ownershipValue,
  }

  if (platform !== 'win32') {
    try {
      const verifyOwnershipBoundary = (
        processOperations.verifyOwnershipBoundary
        ?? verifyPosixOwnershipBoundary
      )
      await verifyOwnershipBoundary(ownershipMarker, childEnvironment)
    } catch (error) {
      return { error }
    }
  }

  const spawnProcess = processOperations.spawnProcess ?? spawn
  const child = spawnProcess(command, args, {
    cwd,
    env: childEnvironment,
    stdio,
    detached: platform !== 'win32',
    windowsHide: true,
  })

  let requestedSignal = null
  let resolveSignal
  const requestedSignalPromise = new Promise(resolve => {
    resolveSignal = resolve
  })

  const handlers = new Map()
  for (const signal of FORWARDED_SIGNALS) {
    const handler = () => {
      if (requestedSignal) return
      requestedSignal = signal
      resolveSignal(signal)
    }
    try {
      process.on(signal, handler)
      handlers.set(signal, handler)
    } catch {
      // Some signals are unavailable on Windows.
    }
  }

  let settleChild
  const childCompletion = new Promise(resolve => {
    settleChild = resolve
  })
  let childSettled = false
  const settleOnce = outcome => {
    if (childSettled) return
    childSettled = true
    settleChild(outcome)
  }
  child.once('error', error => settleOnce({ error }))
  child.once('exit', (code, signal) => settleOnce({ code, signal }))

  const tracker = processOperations.createTracker
    ? processOperations.createTracker({
        child,
        ownershipMarker,
        platform,
      })
    : new PosixOwnedProcessTracker(
        child.pid,
        ownershipMarker,
        processOperations.trackerOptions,
      )

  try {
    try {
      await tracker.start()
    } catch (error) {
      await forceRootGroupExitAfterTrackingFailure(child, platform)
      throw error
    }

    const firstEvent = await Promise.race([
      childCompletion.then(outcome => ({ type: 'child', outcome })),
      requestedSignalPromise.then(signal => ({ type: 'signal', signal })),
    ])

    let childOutcome
    if (firstEvent.type === 'signal') {
      await stopOwnedProcessTree(tracker, firstEvent.signal, gracePeriodMs, forceKillWaitMs)
      childOutcome = await Promise.race([
        childCompletion,
        delay(forceKillWaitMs).then(() => null),
      ])
    } else {
      childOutcome = firstEvent.outcome
      await stopOwnedProcessTree(tracker, 'SIGTERM', gracePeriodMs, forceKillWaitMs)
    }

    if (requestedSignal) return { signal: requestedSignal }
    return childOutcome ?? { error: new Error('Supervised child did not report its exit status') }
  } finally {
    tracker.stop()
    for (const [signal, handler] of handlers) {
      process.off(signal, handler)
    }
  }
}

export function exitLikeSupervisedProcess(outcome) {
  if (outcome.error) {
    const message = outcome.error instanceof Error ? outcome.error.message : String(outcome.error)
    console.error(`Unable to run Playwright: ${message}`)
    process.exitCode = 1
    return
  }

  if (outcome.signal) {
    process.kill(process.pid, outcome.signal)
    return
  }

  process.exitCode = outcome.code ?? 1
}

export function parsePort(value, name) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65_535) {
    throw new Error(`Invalid ${name}: ${value}`)
  }
  return parsed
}

export async function reserveAvailablePort(preferredPort, allowFallback) {
  const tryListen = portToTry => new Promise((resolve, reject) => {
    const server = createTcpServer()
    server.once('error', reject)
    server.listen({ host: '127.0.0.1', port: portToTry, exclusive: true }, () => {
      const address = server.address()
      const resolvedPort = typeof address === 'object' && address ? address.port : portToTry
      server.close(() => resolve(resolvedPort))
    })
  })

  try {
    return await tryListen(preferredPort)
  } catch (error) {
    if (allowFallback && error && typeof error === 'object' && 'code' in error && error.code === 'EADDRINUSE') {
      return await tryListen(0)
    }
    throw error
  }
}

async function responseContainsTravelbackMarker(response) {
  if (!response.ok) return false
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('text/html')) return false

  if (!response.body) {
    return TRAVELBACK_MARKER.test((await response.text()).slice(0, MARKER_READ_LIMIT))
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let source = ''
  let bytesRead = 0

  try {
    while (bytesRead < MARKER_READ_LIMIT) {
      const { done, value } = await reader.read()
      if (done) break
      bytesRead += value.byteLength
      source += decoder.decode(value, { stream: true })
      if (TRAVELBACK_MARKER.test(source)) return true
    }
    source += decoder.decode()
    return TRAVELBACK_MARKER.test(source)
  } finally {
    await reader.cancel().catch(() => {})
  }
}

export async function validateTravelbackDevEndpoint(port, {
  fetchImpl = globalThis.fetch,
  timeoutMs = 2_000,
} = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(`http://127.0.0.1:${port}/`, {
      headers: { accept: 'text/html' },
      redirect: 'error',
      signal: controller.signal,
    })
    return await responseContainsTravelbackMarker(response)
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

export async function readReusableNextDevLock({
  cwd = process.cwd(),
  fetchImpl = globalThis.fetch,
  markerTimeoutMs = 2_000,
} = {}) {
  try {
    const lockPath = path.resolve(cwd, '.next/dev/lock')
    const lock = JSON.parse(await readFile(lockPath, 'utf8'))
    const pid = Number(lock.pid)
    const port = parsePort(lock.port, '.next/dev/lock port')
    if (!Number.isInteger(pid) || pid <= 0) return null
    process.kill(pid, 0)

    if (!await validateTravelbackDevEndpoint(port, {
      fetchImpl,
      timeoutMs: markerTimeoutMs,
    })) {
      return null
    }

    return { pid, port }
  } catch {
    return null
  }
}
