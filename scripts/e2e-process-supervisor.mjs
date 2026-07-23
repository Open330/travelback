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
export const POSIX_OWNERSHIP_SETTLE_DELAY_MS = 100
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

function parsePosixProcessTable(stdout, ownershipMarker = null) {
  const snapshot = new Map()
  for (const line of stdout.split('\n')) {
    const match = line.trimEnd().match(
      /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(.{24})(?:\s+(.*))?$/,
    )
    if (!match) continue
    const commandAndEnvironment = match[6] ?? ''
    const entry = {
      pid: Number(match[1]),
      ppid: Number(match[2]),
      pgid: Number(match[3]),
      uid: Number(match[4]),
      startedAt: match[5],
      owned: ownershipMarker
        ? commandAndEnvironment.includes(ownershipMarker)
        : false,
    }
    snapshot.set(entry.pid, entry)
  }
  return snapshot
}

function runPosixProcessSnapshot(args, ownershipMarker = null) {
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

function readPosixMarkerSnapshot(ownershipMarker) {
  return runPosixProcessSnapshot(
    ['-AxwwE', '-o', 'pid=,ppid=,pgid=,uid=,lstart=,command='],
    ownershipMarker,
  )
}

function readPosixTopologySnapshot() {
  return runPosixProcessSnapshot(
    ['-axo', 'pid=,ppid=,pgid=,uid=,lstart='],
  )
}

async function readPosixProcessIdentities(pids) {
  if (pids.length === 0) return { snapshot: new Map(), errors: [] }

  const results = await Promise.allSettled(
    Array.from({ length: Math.ceil(pids.length / 128) }, (_, index) => {
      const chunk = pids.slice(index * 128, (index + 1) * 128)
      return runPosixProcessSnapshot(
        ['-p', chunk.join(','), '-o', 'pid=,ppid=,pgid=,uid=,lstart='],
      )
    }),
  )
  const snapshot = new Map()
  const errors = []
  for (const result of results) {
    if (result.status === 'rejected') {
      errors.push(result.reason)
      continue
    }
    for (const entry of result.value) snapshot.set(...entry)
  }
  return { snapshot, errors }
}

function processIdentity(entry) {
  return `${entry.pid}:${entry.uid}:${entry.startedAt}`
}

function sameProcessIdentity(left, right) {
  // POSIX `ps` exposes start time only to the second on macOS. UID, the run
  // marker, cached topology, and a narrow validation window strengthen the
  // identity, but cannot provide pidfd-grade atomicity on portable Node alone.
  return left.pid === right.pid
    && left.uid === right.uid
    && left.startedAt === right.startedAt
}

export class PosixOwnedProcessTracker {
  constructor(rootPid, ownershipMarker, {
    readSnapshot,
    readMarkerSnapshot,
    readTopologySnapshot,
    readIdentities,
    signalProcess,
    now,
    wait,
    setIntervalFn,
    clearIntervalFn,
    settleDelayMs = POSIX_OWNERSHIP_SETTLE_DELAY_MS,
    pollIntervalMs = POSIX_OWNERSHIP_POLL_INTERVAL_MS,
    wrapperPid = process.pid,
  } = {}) {
    this.rootPid = rootPid
    this.ownershipMarker = ownershipMarker
    this.readMarkerSnapshot = readMarkerSnapshot
      ?? readSnapshot
      ?? (() => readPosixMarkerSnapshot(this.ownershipMarker))
    this.readTopologySnapshot = readTopologySnapshot
      ?? readSnapshot
      ?? readPosixTopologySnapshot
    this.readIdentities = readIdentities
      ?? readPosixProcessIdentities
    this.signalProcess = signalProcess ?? ((pid, signal) => process.kill(pid, signal))
    this.now = now ?? Date.now
    this.wait = wait ?? delay
    this.setIntervalFn = setIntervalFn ?? setInterval
    this.clearIntervalFn = clearIntervalFn ?? clearInterval
    this.settleDelayMs = settleDelayMs
    this.pollIntervalMs = pollIntervalMs
    this.wrapperPid = wrapperPid
    this.lastValidatedProcesses = new Map()
    this.sentSignals = new Set()
    this.refreshTail = Promise.resolve()
    this.pollTimer = null
    this.wrapperPgid = null
    this.snapshotError = null
    this.operationError = null
    this.cleanupMarkerDiscoveryPending = true
    this.previousOwnedGroups = new Set()
  }

  async start() {
    await this.refresh({ discoverMarkers: true })
    if (this.settleDelayMs > 0) {
      await this.wait(this.settleDelayMs)
      await this.refresh()
    }
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

  refresh(options = {}) {
    const refresh = this.refreshTail
      .catch(() => {})
      .then(() => this.refreshNow(options))
    this.refreshTail = refresh
    return refresh
  }

  async refreshNow({ discoverMarkers = false } = {}) {
    const snapshot = discoverMarkers
      ? await this.readMarkerSnapshot()
      : await this.readTopologySnapshot()
    this.wrapperPgid = snapshot.get(this.wrapperPid)?.pgid ?? this.wrapperPgid

    const liveProcesses = new Map()
    // Carry groups across one validated snapshot so a child that first
    // appears just after its group leader exits can still be claimed. Groups
    // with no claimed member in this snapshot are dropped immediately.
    const activeOwnedGroups = new Set(
      [...this.previousOwnedGroups].filter(
        pgid => pgid > 1 && pgid !== this.wrapperPgid,
      ),
    )
    const claim = current => {
      if (liveProcesses.has(current.pid)) return false
      this.assertSafeIdentity(current)
      liveProcesses.set(current.pid, current)
      activeOwnedGroups.add(current.pgid)
      return true
    }

    // The inherited marker provides persistent discovery seeds. Once a
    // markerless descendant is claimed, its exact PID/UID/start identity
    // becomes an equally valid seed for later snapshots after reparenting.
    for (const current of snapshot.values()) {
      if (!current.owned) continue
      claim(current)
    }
    for (const cached of this.lastValidatedProcesses.values()) {
      const current = snapshot.get(cached.pid)
      if (current && sameProcessIdentity(cached, current)) claim(current)
    }

    let discoveredProcess = true
    while (discoveredProcess) {
      discoveredProcess = false
      for (const current of snapshot.values()) {
        if (liveProcesses.has(current.pid) || current.pid === this.wrapperPid) continue
        if (
          liveProcesses.has(current.ppid)
          || activeOwnedGroups.has(current.pgid)
        ) {
          discoveredProcess = claim(current) || discoveredProcess
        }
      }
    }

    this.lastValidatedProcesses = new Map(
      [...liveProcesses.values()].map(entry => [processIdentity(entry), entry]),
    )
    this.previousOwnedGroups = new Set(
      [...liveProcesses.values()].map(entry => entry.pgid),
    )
    return [...liveProcesses.values()]
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

    if (!Number.isSafeInteger(entry.uid) || entry.uid < 0) {
      throw new Error(`Refusing to act on owned PID ${entry.pid} with invalid UID ${entry.uid}`)
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
    let identityResult
    try {
      identityResult = await this.readIdentities(
        [...this.lastValidatedProcesses.values()].map(entry => entry.pid),
      )
    } catch (error) {
      this.rememberOperationError(error)
      return liveProcesses
    }
    const snapshot = identityResult instanceof Map
      ? identityResult
      : identityResult.snapshot
    for (const error of identityResult.errors ?? []) {
      this.rememberOperationError(error)
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
    const discoverMarkers = this.cleanupMarkerDiscoveryPending
    this.cleanupMarkerDiscoveryPending = false
    try {
      return {
        completeSnapshot: true,
        liveProcesses: await this.refresh({ discoverMarkers }),
        markerDiscoveryAttempted: discoverMarkers,
      }
    } catch (error) {
      this.rememberSnapshotError(error)
      if (discoverMarkers) {
        try {
          return {
            completeSnapshot: true,
            liveProcesses: await this.refresh(),
            markerDiscoveryAttempted: true,
          }
        } catch (topologyError) {
          this.rememberOperationError(topologyError)
        }
      }
      return {
        completeSnapshot: false,
        liveProcesses: await this.readValidatedCache(),
        markerDiscoveryAttempted: discoverMarkers,
      }
    }
  }

  beginCleanupPhase() {
    this.cleanupMarkerDiscoveryPending = true
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
      if (observation.completeSnapshot && observation.liveProcesses.length === 0) {
        if (observation.markerDiscoveryAttempted) return true
        this.cleanupMarkerDiscoveryPending = true
        continue
      }
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
  tracker.beginCleanupPhase?.()
  let stopped = await tracker.signalAndWait(initialSignal, gracePeriodMs)
  if (!stopped) {
    tracker.beginCleanupPhase?.()
    stopped = await tracker.signalAndWait('SIGKILL', forceKillWaitMs)
  }

  let cleanupError = null
  let cleanupAccessorError = null
  try {
    cleanupError = tracker.cleanupError?.() ?? null
  } catch (error) {
    cleanupAccessorError = error
  }

  if (!stopped) {
    throw new Error(
      `${describeTracker(tracker)} survived forced termination`,
      cleanupError || cleanupAccessorError
        ? { cause: cleanupError ?? cleanupAccessorError }
        : undefined,
    )
  }
  if (cleanupError) {
    throw new Error(
      `Cleanup of ${describeTracker(tracker)} could not be fully verified: ${cleanupError.message}`,
      { cause: cleanupError },
    )
  }
  if (cleanupAccessorError) {
    const detail = cleanupAccessorError instanceof Error
      ? cleanupAccessorError.message
      : String(cleanupAccessorError)
    throw new Error(
      `Cleanup of ${describeTracker(tracker)} could not read its verification diagnostics: ${detail}`,
      { cause: cleanupAccessorError },
    )
  }
}

function describeTracker(tracker) {
  try {
    const description = tracker.describe?.()
    if (typeof description === 'string' && description.trim()) return description
  } catch {
    // Diagnostic formatting must never replace cleanup evidence.
  }
  return 'owned process tracker'
}

async function forceRootGroupExitAfterTrackingFailure({
  child,
  platform,
  completion,
  timeoutMs,
}) {
  if (!child?.pid) return
  if (platform === 'win32') {
    child.kill('SIGKILL')
  } else {
    try {
      process.kill(-child.pid, 'SIGKILL')
    } catch (error) {
      if (!isMissingProcessError(error)) throw error
    }
  }

  const outcome = await Promise.race([
    completion,
    delay(timeoutMs).then(() => null),
  ])
  if (!outcome && isProcessAlive(child.pid)) {
    throw new Error(`Root process group ${child.pid} survived startup cleanup`)
  }
}

function waitForChildOutcome(child) {
  return new Promise(resolve => {
    child.once('error', error => resolve({ error }))
    child.once('exit', (code, signal) => resolve({ code, signal }))
  })
}

function createForwardedSignalLatch(signalEmitter) {
  let requestedSignal = null
  let resolveSignal
  const promise = new Promise(resolve => {
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
      signalEmitter.on(signal, handler)
      handlers.set(signal, handler)
    } catch {
      // Some signals are unavailable on Windows.
    }
  }

  return {
    promise,
    get requestedSignal() {
      return requestedSignal
    },
    dispose() {
      for (const [signal, handler] of handlers) {
        signalEmitter.off(signal, handler)
      }
      handlers.clear()
    },
  }
}

function composeStartupError(startError, cleanupErrors) {
  const uniqueCleanupErrors = cleanupErrors.filter(
    (error, index, errors) => error !== startError && errors.indexOf(error) === index,
  )
  if (uniqueCleanupErrors.length === 0) return startError
  return new AggregateError(
    [startError, ...uniqueCleanupErrors],
    'Process tracking failed to start and startup cleanup also failed',
    { cause: startError },
  )
}

function assertTrackerContract(tracker) {
  if (
    !tracker
    || typeof tracker.start !== 'function'
    || typeof tracker.signalAndWait !== 'function'
    || typeof tracker.describe !== 'function'
    || typeof tracker.stop !== 'function'
  ) {
    throw new TypeError(
      'Process tracker must provide start, signalAndWait, describe, and stop',
    )
  }
  return tracker
}

function composePrimaryAndFinalizationErrors(primaryError, finalizationErrors) {
  if (finalizationErrors.length === 0) return primaryError
  if (!primaryError) {
    if (finalizationErrors.length === 1) return finalizationErrors[0]
    return new AggregateError(finalizationErrors, 'Process session finalization failed')
  }
  return new AggregateError(
    [primaryError, ...finalizationErrors],
    'Process supervision failed and session finalization also failed',
    { cause: primaryError.cause ?? primaryError },
  )
}

async function cleanupAfterTrackerStartFailure({
  tracker,
  session,
  platform,
  startError,
  gracePeriodMs,
  forceKillWaitMs,
  forceRootGroupExit,
  stopTracker,
}) {
  const cleanupErrors = []
  try {
    stopTracker()
  } catch (error) {
    cleanupErrors.push(error)
  }

  if (session.forceRootExit || forceRootGroupExit) {
    try {
      const cleanupRequest = {
        child: session.child,
        platform,
        completion: session.completion,
        timeoutMs: forceKillWaitMs,
      }
      if (session.forceRootExit) {
        await session.forceRootExit(cleanupRequest)
      } else {
        await forceRootGroupExit(cleanupRequest)
      }
    } catch (error) {
      cleanupErrors.push(error)
    }
  }

  try {
    await stopOwnedProcessTree(
      tracker,
      'SIGTERM',
      gracePeriodMs,
      forceKillWaitMs,
    )
  } catch (error) {
    cleanupErrors.push(error)
  }

  throw composeStartupError(startError, cleanupErrors)
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
    const snapshot = await readPosixMarkerSnapshot(ownershipMarker)
    if (!snapshot.get(probe.pid)?.owned) {
      throw new UnsupportedProcessContainmentError(
        'This platform does not expose inherited E2E ownership seeds; refusing to launch outside the marker-plus-observed-topology contract',
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
 * Establishes inherited run seeds before launch, then combines those seeds
 * with validated topology and cached PID/UID/start identities. A Windows
 * provider must atomically contain the target and arm completion before it
 * can execute.
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
  const launchContainedProcess = processOperations.launchContainedProcess
  if (platform === 'win32' && !launchContainedProcess) {
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

  const signalLatch = createForwardedSignalLatch(
    processOperations.signalEmitter ?? process,
  )
  let session = null
  let tracker = null
  let trackerStopped = false
  let providerRollback = null
  let providerHandoffAccepted = false
  let primaryError = null
  let outcomeError = null
  const stopTracker = () => {
    if (!tracker || trackerStopped) return
    trackerStopped = true
    tracker.stop?.()
  }
  try {
    if (launchContainedProcess) {
      // The provider is the sole spawning authority. It must arm completion
      // and register rollback before spawning, then establish containment
      // (for example, assign a suspended Windows child to a Job Object) before
      // allowing the target to execute.
      session = await launchContainedProcess({
        command,
        args,
        cwd,
        env: childEnvironment,
        stdio,
        ownershipMarker,
        platform,
        registerRollback(dispose) {
          if (typeof dispose !== 'function') {
            throw new TypeError('Contained launch rollback must be a function')
          }
          providerRollback = dispose
        },
      })
    } else {
      try {
        const verifyOwnershipBoundary = (
          processOperations.verifyOwnershipBoundary
          ?? verifyPosixOwnershipBoundary
        )
        await verifyOwnershipBoundary(ownershipMarker, childEnvironment)
      } catch (error) {
        // A rejected probe means ownership safety is unknown. Its error wins
        // over a concurrently latched wrapper signal, after the probe's own
        // exact-cleanup finally block has completed.
        return { error }
      }

      if (signalLatch.requestedSignal) {
        return { signal: signalLatch.requestedSignal }
      }

      const spawnProcess = processOperations.spawnProcess ?? spawn
      const child = spawnProcess(command, args, {
        cwd,
        env: childEnvironment,
        stdio,
        detached: true,
        windowsHide: true,
      })
      const completion = waitForChildOutcome(child)
      try {
        const candidateTracker = processOperations.createTracker
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
        tracker = assertTrackerContract(candidateTracker)
      } catch (error) {
        const cleanupErrors = []
        try {
          await (
            processOperations.forceRootGroupExit
            ?? forceRootGroupExitAfterTrackingFailure
          )({
            child,
            platform,
            completion,
            timeoutMs: forceKillWaitMs,
          })
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError)
        }

        // A custom tracker may fail its construction contract after the
        // target has already forked into another group. Rebuild the known-safe
        // POSIX tracker so marker discovery and bounded cached cleanup still
        // run after the exact root-group fallback.
        const fallbackTracker = new PosixOwnedProcessTracker(
          child.pid,
          ownershipMarker,
          processOperations.trackerOptions,
        )
        try {
          try {
            await fallbackTracker.start()
          } catch (fallbackStartError) {
            cleanupErrors.push(fallbackStartError)
          }
          try {
            await stopOwnedProcessTree(
              fallbackTracker,
              'SIGTERM',
              gracePeriodMs,
              forceKillWaitMs,
            )
          } catch (fallbackCleanupError) {
            cleanupErrors.push(fallbackCleanupError)
          }
        } finally {
          try {
            fallbackTracker.stop()
          } catch (fallbackStopError) {
            cleanupErrors.push(fallbackStopError)
          }
        }
        throw composeStartupError(error, cleanupErrors)
      }
      session = {
        child,
        completion,
        tracker,
        async dispose() {},
      }
    }

    if (launchContainedProcess && !providerRollback) {
      throw new Error(
        'Contained launch provider must register rollback before spawning',
      )
    }
    if (!session || typeof session.dispose !== 'function') {
      throw new Error(
        'Contained launch provider must roll back before rejecting and return an idempotent dispose function on success',
      )
    }
    if (!session.tracker || !session.completion) {
      throw new Error(
        'Contained launch provider must return completion, tracker, and dispose',
      )
    }
    assertTrackerContract(session.tracker)
    if (launchContainedProcess) providerHandoffAccepted = true

    tracker = session.tracker
    const childCompletion = Promise.resolve(session.completion)
      .catch(error => ({ error }))

    try {
      await tracker.start()
    } catch (error) {
      await cleanupAfterTrackerStartFailure({
        tracker,
        session: { ...session, completion: childCompletion },
        platform,
        startError: error,
        gracePeriodMs,
        forceKillWaitMs,
        forceRootGroupExit: (
          processOperations.forceRootGroupExit
          ?? forceRootGroupExitAfterTrackingFailure
        ),
        stopTracker,
      })
    }

    const firstEvent = await Promise.race([
      childCompletion.then(outcome => ({ type: 'child', outcome })),
      signalLatch.promise.then(signal => ({ type: 'signal', signal })),
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

    if (signalLatch.requestedSignal) return { signal: signalLatch.requestedSignal }
    const outcome = childOutcome
      ?? { error: new Error('Supervised child did not report its exit status') }
    outcomeError = outcome.error ?? null
    return outcome
  } catch (error) {
    primaryError = error
    throw error
  } finally {
    const finalizationErrors = []
    try {
      stopTracker()
    } catch (error) {
      finalizationErrors.push(error)
    }
    const dispose = launchContainedProcess && !providerHandoffAccepted
      ? providerRollback ?? session?.dispose
      : session?.dispose ?? providerRollback
    try {
      await dispose?.()
    } catch (error) {
      finalizationErrors.push(error)
    }
    try {
      signalLatch.dispose()
    } catch (error) {
      finalizationErrors.push(error)
    }
    if (finalizationErrors.length > 0) {
      throw composePrimaryAndFinalizationErrors(
        primaryError ?? outcomeError,
        finalizationErrors,
      )
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
