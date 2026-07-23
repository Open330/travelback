import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  POSIX_OWNERSHIP_POLL_INTERVAL_MS,
  PosixOwnedProcessTracker,
  readReusableNextDevLock,
  runSupervisedProcess,
  stopOwnedProcessTree,
  UnsupportedProcessContainmentError,
} from './e2e-process-supervisor.mjs'

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(scriptsDirectory, 'fixtures/fake-process-tree.mjs')
const harnessPath = path.join(scriptsDirectory, 'fixtures/supervisor-harness.mjs')
const isPosix = process.platform !== 'win32'

async function assertWindowsContainmentRefusal() {
  let spawned = false
  let trackerCreated = false
  const outcome = await runSupervisedProcess('must-not-run.exe', [], {
    stdio: 'ignore',
    processOperations: {
      platform: 'win32',
      spawnProcess() {
        spawned = true
        throw new Error('Windows target was launched without containment')
      },
      createTracker() {
        trackerCreated = true
        throw new Error('Windows tracker was created after launch')
      },
    },
  })

  assert.equal(spawned, false)
  assert.equal(trackerCreated, false)
  assert.ok(outcome.error instanceof UnsupportedProcessContainmentError)
  assert.match(outcome.error.message, /Job Object/)
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

test('latches a wrapper signal during ownership preflight and never launches the target', async () => {
  const signalEmitter = new EventEmitter()
  const probeStarted = deferred()
  const allowProbeCleanup = deferred()
  let probeCleaned = false
  let spawned = false
  let settled = false

  const runPromise = runSupervisedProcess('must-not-run', [], {
    stdio: 'ignore',
    processOperations: {
      platform: 'darwin',
      signalEmitter,
      async verifyOwnershipBoundary() {
        probeStarted.resolve()
        try {
          await allowProbeCleanup.promise
        } finally {
          probeCleaned = true
        }
      },
      spawnProcess() {
        spawned = true
        throw new Error('Target launched after preflight signal')
      },
    },
  })
  runPromise.then(
    () => {
      settled = true
    },
    () => {
      settled = true
    },
  )

  await probeStarted.promise
  signalEmitter.emit('SIGTERM')
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(settled, false)
  assert.equal(probeCleaned, false)

  allowProbeCleanup.resolve()
  assert.deepEqual(await runPromise, { signal: 'SIGTERM' })
  assert.equal(probeCleaned, true)
  assert.equal(spawned, false)
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT']) {
    assert.equal(signalEmitter.listenerCount(signal), 0)
  }
})

test('a rejecting ownership preflight preserves its safety error over a latched signal', async () => {
  const signalEmitter = new EventEmitter()
  const probeError = new Error('ownership probe could not verify its boundary')
  let probeCleaned = false
  let spawned = false

  const outcome = await runSupervisedProcess('must-not-run', [], {
    stdio: 'ignore',
    processOperations: {
      platform: 'darwin',
      signalEmitter,
      async verifyOwnershipBoundary() {
        try {
          signalEmitter.emit('SIGTERM')
          throw probeError
        } finally {
          probeCleaned = true
        }
      },
      spawnProcess() {
        spawned = true
        throw new Error('Target launched after rejected preflight')
      },
    },
  })

  assert.equal(outcome.error, probeError)
  assert.equal(probeCleaned, true)
  assert.equal(spawned, false)
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT']) {
    assert.equal(signalEmitter.listenerCount(signal), 0)
  }
})

function processIsAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ESRCH') return false
    throw error
  }
}

async function waitForFile(filePath, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      return await readFile(filePath, 'utf8')
    } catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT') throw error
      await new Promise(resolve => setTimeout(resolve, 20))
    }
  }
  throw new Error(`Timed out waiting for ${filePath}`)
}

async function waitForProcessExit(pid, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs
  while (processIsAlive(pid)) {
    if (Date.now() >= deadline) return false
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  return true
}

function waitForChild(child, timeoutMs = 5_000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Process ${child.pid} did not exit`)), timeoutMs)
    child.once('error', error => {
      clearTimeout(timeout)
      reject(error)
    })
    child.once('close', (code, signal) => {
      clearTimeout(timeout)
      resolve({ code, signal })
    })
  })
}

function spawnHarness(mode, stateDirectory) {
  return spawn(process.execPath, [harnessPath, mode, stateDirectory], {
    env: {
      ...process.env,
      SUPERVISOR_GRACE_MS: '200',
      SUPERVISOR_KILL_WAIT_MS: '1_000',
    },
    stdio: ['ignore', 'ignore', 'inherit'],
  })
}

async function readTree(stateDirectory) {
  return JSON.parse(await waitForFile(path.join(stateDirectory, 'tree.json')))
}

async function terminateExactProcess(child) {
  if (!child?.pid || !processIsAlive(child.pid)) return
  child.kill('SIGTERM')
  if (await waitForProcessExit(child.pid, 500)) return
  child.kill('SIGKILL')
  await waitForProcessExit(child.pid, 1_000)
}

async function terminateExactPid(pid) {
  if (!pid || !processIsAlive(pid)) return
  try {
    process.kill(pid, 'SIGTERM')
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ESRCH') return
    throw error
  }
  if (await waitForProcessExit(pid, 500)) return
  try {
    process.kill(pid, 'SIGKILL')
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ESRCH') return
    throw error
  }
  await waitForProcessExit(pid, 1_000)
}

async function terminateExactProcessGroup(rootPid) {
  if (!isPosix || !rootPid) return
  try {
    process.kill(-rootPid, 'SIGKILL')
  } catch (error) {
    if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ESRCH') throw error
  }
  await waitForProcessExit(rootPid, 1_000)
}

test('preserves normal and nonzero child exits and reaps their process trees', async () => {
  if (!isPosix) return assertWindowsContainmentRefusal()

  for (const [mode, expectedCode] of [['normal', 0], ['nonzero', 23]]) {
    const stateDirectory = await mkdtemp(path.join(os.tmpdir(), `travelback-${mode}-`))
    let harness
    let tree
    try {
      harness = spawnHarness(mode, stateDirectory)
      tree = await readTree(stateDirectory)
      assert.deepEqual(await waitForChild(harness), { code: expectedCode, signal: null })
      assert.equal(await waitForProcessExit(tree.rootPid), true)
      assert.equal(await waitForProcessExit(tree.grandchildPid), true)
    } finally {
      await terminateExactProcess(harness)
      await terminateExactProcessGroup(tree?.rootPid)
      await terminateExactPid(tree?.grandchildPid)
      await rm(stateDirectory, { recursive: true, force: true })
    }
  }
})

test('reaps a detached stubborn grandchild after its direct child exits normally', async () => {
  if (!isPosix) return assertWindowsContainmentRefusal()

  const stateDirectory = await mkdtemp(path.join(os.tmpdir(), 'travelback-orphan-'))
  let harness
  let tree
  try {
    harness = spawnHarness('orphan-stubborn', stateDirectory)
    tree = await readTree(stateDirectory)
    assert.deepEqual(await waitForChild(harness), { code: 0, signal: null })
    assert.equal(await waitForProcessExit(tree.rootPid), true)
    assert.equal(await waitForProcessExit(tree.grandchildPid), true)
    await waitForFile(path.join(stateDirectory, 'grandchild-SIGTERM'))
  } finally {
    await terminateExactProcess(harness)
    await terminateExactProcessGroup(tree?.rootPid)
    await terminateExactPid(tree?.grandchildPid)
    await rm(stateDirectory, { recursive: true, force: true })
  }
})

test('reaps a detached stubborn descendant when its root exits immediately', async () => {
  if (!isPosix) return assertWindowsContainmentRefusal()

  const stateDirectory = await mkdtemp(path.join(os.tmpdir(), 'travelback-immediate-orphan-'))
  let harness
  let tree
  try {
    harness = spawnHarness('immediate-orphan-stubborn', stateDirectory)
    tree = await readTree(stateDirectory)
    assert.deepEqual(await waitForChild(harness), { code: 0, signal: null })
    assert.equal(await waitForProcessExit(tree.rootPid), true)
    assert.equal(await waitForProcessExit(tree.grandchildPid), true)
    await waitForFile(path.join(stateDirectory, 'grandchild-SIGTERM'))
  } finally {
    await terminateExactProcess(harness)
    await terminateExactProcessGroup(tree?.rootPid)
    await terminateExactPid(tree?.grandchildPid)
    await rm(stateDirectory, { recursive: true, force: true })
  }
})

test('reaps a cached descendant after it strips the inherited ownership marker', async () => {
  if (!isPosix) return assertWindowsContainmentRefusal()

  const stateDirectory = await mkdtemp(path.join(os.tmpdir(), 'travelback-markerless-orphan-'))
  let harness
  let tree
  try {
    harness = spawnHarness('stripped-marker-stubborn', stateDirectory)
    tree = await readTree(stateDirectory)
    assert.deepEqual(await waitForChild(harness), { code: 0, signal: null })
    assert.equal(await waitForProcessExit(tree.rootPid), true)
    assert.equal(await waitForProcessExit(tree.grandchildPid), true)
    await waitForFile(path.join(stateDirectory, 'grandchild-SIGTERM'))
  } finally {
    await terminateExactProcess(harness)
    await terminateExactProcessGroup(tree?.rootPid)
    await terminateExactPid(tree?.grandchildPid)
    await rm(stateDirectory, { recursive: true, force: true })
  }
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  test(`forwards ${signal}, preserves signal status, and leaves an unrelated sentinel alive`, async () => {
    if (!isPosix) return assertWindowsContainmentRefusal()

    const stateDirectory = await mkdtemp(path.join(os.tmpdir(), `travelback-${signal.toLowerCase()}-`))
    const sentinelDirectory = await mkdtemp(path.join(os.tmpdir(), 'travelback-sentinel-'))
    let harness
    let sentinel
    let tree
    try {
      sentinel = spawn(
        process.execPath,
        [fixturePath, 'grandchild', 'wait', sentinelDirectory],
        { stdio: 'ignore' },
      )
      await waitForFile(path.join(sentinelDirectory, 'grandchild-ready'))

      harness = spawnHarness('wait', stateDirectory)
      tree = await readTree(stateDirectory)
      assert.equal(harness.kill(signal), true)
      assert.deepEqual(await waitForChild(harness), { code: null, signal })
      assert.equal(await waitForProcessExit(tree.rootPid), true)
      assert.equal(await waitForProcessExit(tree.grandchildPid), true)
      assert.equal(processIsAlive(sentinel.pid), true)
      await waitForFile(path.join(stateDirectory, `root-${signal}`))
      await waitForFile(path.join(stateDirectory, `grandchild-${signal}`))
    } finally {
      await terminateExactProcess(harness)
      await terminateExactProcessGroup(tree?.rootPid)
      await terminateExactPid(tree?.grandchildPid)
      await terminateExactProcess(sentinel)
      await rm(stateDirectory, { recursive: true, force: true })
      await rm(sentinelDirectory, { recursive: true, force: true })
    }
  })
}

test('escalates only stubborn owned identities and ignores repeated wrapper signals', async () => {
  if (!isPosix) return assertWindowsContainmentRefusal()

  const stateDirectory = await mkdtemp(path.join(os.tmpdir(), 'travelback-stubborn-'))
  const sentinelDirectory = await mkdtemp(path.join(os.tmpdir(), 'travelback-sentinel-'))
  let harness
  let sentinel
  let tree
  try {
    sentinel = spawn(
      process.execPath,
      [fixturePath, 'grandchild', 'wait', sentinelDirectory],
      { stdio: 'ignore' },
    )
    await waitForFile(path.join(sentinelDirectory, 'grandchild-ready'))

    harness = spawnHarness('stubborn', stateDirectory)
    tree = await readTree(stateDirectory)
    assert.equal(harness.kill('SIGTERM'), true)
    await new Promise(resolve => setTimeout(resolve, 25))
    assert.equal(harness.kill('SIGTERM'), true)

    assert.deepEqual(await waitForChild(harness), { code: null, signal: 'SIGTERM' })
    assert.equal(await waitForProcessExit(tree.rootPid), true)
    assert.equal(await waitForProcessExit(tree.grandchildPid), true)
    assert.equal(processIsAlive(sentinel.pid), true)
    await waitForFile(path.join(stateDirectory, 'root-SIGTERM'))
    await waitForFile(path.join(stateDirectory, 'grandchild-SIGTERM'))
  } finally {
    await terminateExactProcess(harness)
    await terminateExactProcessGroup(tree?.rootPid)
    await terminateExactPid(tree?.grandchildPid)
    await terminateExactProcess(sentinel)
    await rm(stateDirectory, { recursive: true, force: true })
    await rm(sentinelDirectory, { recursive: true, force: true })
  }
})

function ownedProcessEntry({
  pid = 41_001,
  ppid = 1,
  pgid = 41_001,
  uid = 501,
  startedAt = 'Thu Jul 23 18:00:00 2026',
  owned = true,
} = {}) {
  return { pid, ppid, pgid, uid, startedAt, owned }
}

function inertInterval(callback, milliseconds) {
  return {
    callback,
    milliseconds,
    unref() {},
  }
}

function fakeChildProcess(pid) {
  const child = new EventEmitter()
  child.pid = pid
  child.kill = () => true
  return child
}

test('first tracker refresh failure retries bounded cleanup and forces the exact root group', async () => {
  const root = ownedProcessEntry({ pid: 61_001, pgid: 61_001 })
  const detached = ownedProcessEntry({
    pid: 61_002,
    ppid: 1,
    pgid: 61_002,
  })
  const sentinel = ownedProcessEntry({
    pid: 62_001,
    ppid: 1,
    pgid: 62_001,
    owned: false,
  })
  const startError = new Error('injected first tracker refresh failure')
  const child = fakeChildProcess(root.pid)
  const signalEmitter = new EventEmitter()
  const livePids = new Set([root.pid, detached.pid])
  const signals = []
  let markerCalls = 0
  let rootFallbackCalls = 0

  const snapshot = ({ markers }) => new Map([
    ...(livePids.has(root.pid)
      ? [[root.pid, { ...root, owned: markers }]]
      : []),
    ...(livePids.has(detached.pid)
      ? [[detached.pid, { ...detached, owned: markers }]]
      : []),
    [sentinel.pid, sentinel],
  ])
  const tracker = new PosixOwnedProcessTracker(root.pid, 'owner=test', {
    readMarkerSnapshot: async () => {
      markerCalls += 1
      if (markerCalls === 1) throw startError
      return snapshot({ markers: true })
    },
    readTopologySnapshot: async () => snapshot({ markers: false }),
    readIdentities: async pids => new Map(
      [...livePids]
        .filter(pid => pids.includes(pid))
        .map(pid => [pid, pid === root.pid ? root : detached]),
    ),
    signalProcess(pid, signal) {
      signals.push({ pid, signal })
      if (signal === 'SIGTERM') livePids.delete(pid)
    },
    setIntervalFn: inertInterval,
    clearIntervalFn() {},
    settleDelayMs: 0,
    wrapperPid: 91_001,
  })

  await assert.rejects(
    runSupervisedProcess('fake-root', [], {
      stdio: 'ignore',
      gracePeriodMs: 50,
      forceKillWaitMs: 50,
      processOperations: {
        platform: 'darwin',
        signalEmitter,
        verifyOwnershipBoundary: async () => {},
        spawnProcess: () => child,
        createTracker: () => tracker,
        async forceRootGroupExit({ completion }) {
          rootFallbackCalls += 1
          livePids.delete(root.pid)
          child.emit('exit', null, 'SIGKILL')
          await completion
        },
      },
    }),
    error => error === startError,
  )

  assert.equal(rootFallbackCalls, 1)
  assert.deepEqual(signals, [{ pid: detached.pid, signal: 'SIGTERM' }])
  assert.equal(livePids.has(detached.pid), false)
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT']) {
    assert.equal(signalEmitter.listenerCount(signal), 0)
  }
})

test('settle refresh failure cleans a cached detached identity and composes cleanup evidence', async () => {
  const root = ownedProcessEntry({ pid: 63_001, pgid: 63_001 })
  const detached = ownedProcessEntry({
    pid: 63_002,
    ppid: root.pid,
    pgid: 63_002,
    owned: false,
  })
  const sentinel = ownedProcessEntry({
    pid: 64_001,
    ppid: 1,
    pgid: 64_001,
    owned: false,
  })
  const settleError = new Error('injected settle topology failure')
  const cleanupSnapshotError = new Error('injected startup-cleanup snapshot failure')
  const child = fakeChildProcess(root.pid)
  const livePids = new Set([root.pid, detached.pid])
  const signals = []
  let markerCalls = 0
  let rootFallbackCalls = 0
  let currentTime = 0

  const tracker = new PosixOwnedProcessTracker(root.pid, 'owner=test', {
    readMarkerSnapshot: async () => {
      markerCalls += 1
      if (markerCalls > 1) throw cleanupSnapshotError
      return new Map([
        [root.pid, root],
        [detached.pid, detached],
        [sentinel.pid, sentinel],
      ])
    },
    readTopologySnapshot: async () => {
      throw settleError
    },
    readIdentities: async pids => new Map(
      [...livePids]
        .filter(pid => pids.includes(pid))
        .map(pid => [pid, pid === root.pid ? root : detached]),
    ),
    signalProcess(pid, signal) {
      signals.push({ pid, signal })
      if (signal === 'SIGKILL') livePids.delete(pid)
    },
    now: () => currentTime,
    wait: async milliseconds => {
      currentTime += milliseconds
    },
    setIntervalFn: inertInterval,
    clearIntervalFn() {},
    settleDelayMs: 1,
    wrapperPid: 91_001,
  })

  await assert.rejects(
    runSupervisedProcess('fake-root', [], {
      stdio: 'ignore',
      gracePeriodMs: 100,
      forceKillWaitMs: 100,
      processOperations: {
        platform: 'darwin',
        signalEmitter: new EventEmitter(),
        verifyOwnershipBoundary: async () => {},
        spawnProcess: () => child,
        createTracker: () => tracker,
        async forceRootGroupExit({ completion }) {
          rootFallbackCalls += 1
          livePids.delete(root.pid)
          child.emit('exit', null, 'SIGKILL')
          await completion
        },
      },
    }),
    error => {
      assert.ok(error instanceof AggregateError)
      assert.equal(error.cause, settleError)
      assert.equal(error.errors[0], settleError)
      assert.ok(error.errors.some(cleanupError => cleanupError.cause === cleanupSnapshotError))
      return true
    },
  )

  assert.equal(rootFallbackCalls, 1)
  assert.deepEqual(signals, [
    { pid: detached.pid, signal: 'SIGTERM' },
    { pid: detached.pid, signal: 'SIGKILL' },
  ])
  assert.equal(livePids.has(detached.pid), false)
  assert.ok(currentTime <= 250)
})

test('a malformed post-spawn tracker also cleans a detached marker child before rejection', async () => {
  const root = ownedProcessEntry({ pid: 66_001, pgid: 66_001 })
  const detached = ownedProcessEntry({
    pid: 66_002,
    ppid: 1,
    pgid: 66_002,
  })
  const sentinel = ownedProcessEntry({
    pid: 67_001,
    ppid: 1,
    pgid: 67_001,
    owned: false,
  })
  const child = fakeChildProcess(root.pid)
  const livePids = new Set([root.pid, detached.pid])
  const signals = []
  const fallbackStopError = new Error('injected fallback tracker stop failure')
  let rootFallbackCalls = 0

  await assert.rejects(
    runSupervisedProcess('fake-root', [], {
      stdio: 'ignore',
      forceKillWaitMs: 50,
      processOperations: {
        platform: 'darwin',
        signalEmitter: new EventEmitter(),
        verifyOwnershipBoundary: async () => {},
        spawnProcess: () => child,
        createTracker: () => null,
        trackerOptions: {
          readMarkerSnapshot: async () => new Map([
            ...(livePids.has(root.pid) ? [[root.pid, root]] : []),
            ...(livePids.has(detached.pid) ? [[detached.pid, detached]] : []),
            [sentinel.pid, sentinel],
          ]),
          readTopologySnapshot: async () => new Map([
            ...(livePids.has(root.pid)
              ? [[root.pid, { ...root, owned: false }]]
              : []),
            ...(livePids.has(detached.pid)
              ? [[detached.pid, { ...detached, owned: false }]]
              : []),
            [sentinel.pid, sentinel],
          ]),
          readIdentities: async pids => new Map(
            [...livePids]
              .filter(pid => pids.includes(pid))
              .map(pid => [pid, pid === root.pid ? root : detached]),
          ),
          signalProcess(pid, signal) {
            signals.push({ pid, signal })
            if (signal === 'SIGTERM') livePids.delete(pid)
          },
          setIntervalFn: inertInterval,
          clearIntervalFn() {
            throw fallbackStopError
          },
          settleDelayMs: 0,
          wrapperPid: 91_001,
        },
        async forceRootGroupExit({ completion }) {
          rootFallbackCalls += 1
          livePids.delete(root.pid)
          child.emit('exit', null, 'SIGKILL')
          await completion
        },
      },
    }),
    error => {
      assert.ok(error instanceof AggregateError)
      assert.ok(error.cause instanceof TypeError)
      assert.match(error.cause.message, /must provide start, signalAndWait, and stop/)
      assert.equal(error.errors[0], error.cause)
      assert.ok(error.errors.includes(fallbackStopError))
      return true
    },
  )

  assert.equal(rootFallbackCalls, 1)
  assert.deepEqual(signals, [{ pid: detached.pid, signal: 'SIGTERM' }])
  assert.equal(livePids.has(detached.pid), false)
})

test('marker seeds iteratively claim markerless PPID and PGID descendants', async () => {
  const wrapper = ownedProcessEntry({
    pid: 91_001,
    pgid: 91_001,
    owned: false,
  })
  const root = ownedProcessEntry({ pid: 41_001, pgid: 41_001 })
  const listener = ownedProcessEntry({
    pid: 41_002,
    ppid: root.pid,
    pgid: root.pgid,
    owned: false,
  })
  const worker = ownedProcessEntry({
    pid: 41_003,
    ppid: listener.pid,
    pgid: 41_003,
    owned: false,
  })
  const groupOnly = ownedProcessEntry({
    pid: 41_004,
    ppid: 1,
    pgid: root.pgid,
    owned: false,
  })
  const sentinel = ownedProcessEntry({
    pid: 51_001,
    ppid: 1,
    pgid: 51_001,
    owned: false,
  })
  const newWorker = ownedProcessEntry({
    pid: 41_005,
    ppid: listener.pid,
    pgid: 41_005,
    owned: false,
  })
  const lateGroupChild = ownedProcessEntry({
    pid: 41_006,
    ppid: 1,
    pgid: root.pgid,
    owned: false,
  })
  const snapshots = [
    // Reverse dependency order proves claiming iterates to a fixed point.
    new Map([
      [worker.pid, worker],
      [listener.pid, listener],
      [groupOnly.pid, groupOnly],
      [sentinel.pid, sentinel],
      [root.pid, root],
      [wrapper.pid, wrapper],
    ]),
    new Map([
      [lateGroupChild.pid, lateGroupChild],
      [listener.pid, { ...listener, ppid: 1 }],
      [worker.pid, { ...worker, ppid: 1 }],
      [groupOnly.pid, groupOnly],
      [sentinel.pid, sentinel],
      [wrapper.pid, wrapper],
    ]),
    new Map([
      [newWorker.pid, newWorker],
      [lateGroupChild.pid, lateGroupChild],
      [listener.pid, { ...listener, ppid: 1 }],
      [worker.pid, { ...worker, ppid: 1 }],
      [groupOnly.pid, groupOnly],
      [sentinel.pid, sentinel],
      [wrapper.pid, wrapper],
    ]),
  ]
  let snapshotIndex = 0
  const tracker = new PosixOwnedProcessTracker(root.pid, 'owner=test', {
    readSnapshot: async () => snapshots[snapshotIndex++],
    setIntervalFn: inertInterval,
    clearIntervalFn() {},
    settleDelayMs: 0,
    wrapperPid: wrapper.pid,
  })

  try {
    await tracker.start()
    assert.deepEqual(
      (await tracker.refresh()).map(entry => entry.pid).sort((left, right) => left - right),
      [listener.pid, worker.pid, groupOnly.pid, lateGroupChild.pid],
    )
    assert.deepEqual(
      (await tracker.refresh()).map(entry => entry.pid).sort((left, right) => left - right),
      [listener.pid, worker.pid, groupOnly.pid, newWorker.pid, lateGroupChild.pid],
    )
  } finally {
    tracker.stop()
  }
})

for (const [failurePoint, failureCall] of [
  ['before TERM', 2],
  ['between TERM polls', 3],
  ['before KILL', 5],
]) {
  test(`cached exact identities survive a process snapshot failure ${failurePoint}`, async () => {
    const entry = ownedProcessEntry()
    const snapshotError = new Error(`injected snapshot failure ${failurePoint}`)
    const signals = []
    let snapshotCalls = 0
    let alive = true
    let currentTime = 0
    let timer

    const tracker = new PosixOwnedProcessTracker(entry.pid, 'owner=test', {
      readSnapshot: async () => {
        snapshotCalls += 1
        if (snapshotCalls === failureCall) throw snapshotError
        return new Map(alive ? [[entry.pid, entry]] : [])
      },
      readIdentities: async pids => new Map(
        alive && pids.includes(entry.pid) ? [[entry.pid, { ...entry }]] : [],
      ),
      signalProcess(pid, signal) {
        signals.push({ pid, signal })
        if (signal === 'SIGKILL') alive = false
      },
      now: () => currentTime,
      wait: async milliseconds => {
        currentTime += milliseconds
      },
      setIntervalFn: (callback, milliseconds) => {
        timer = inertInterval(callback, milliseconds)
        return timer
      },
      clearIntervalFn() {},
      settleDelayMs: 0,
      wrapperPid: 91_001,
    })

    try {
      await tracker.start()
      await assert.rejects(
        stopOwnedProcessTree(tracker, 'SIGTERM', 100, 100),
        error => {
          assert.equal(error.cause, snapshotError)
          assert.match(error.message, /could not be fully verified/)
          return true
        },
      )
    } finally {
      tracker.stop()
    }

    assert.deepEqual(signals, [
      { pid: entry.pid, signal: 'SIGTERM' },
      { pid: entry.pid, signal: 'SIGKILL' },
    ])
    assert.equal(alive, false)
    assert.ok(currentTime <= 250)
    assert.equal(timer.milliseconds, POSIX_OWNERSHIP_POLL_INTERVAL_MS)
  })
}

test('snapshot fallback revalidates a cached markerless descendant by PID and start', async () => {
  const root = ownedProcessEntry({ pid: 41_101, pgid: 41_101 })
  const listener = ownedProcessEntry({
    pid: 41_102,
    ppid: root.pid,
    pgid: root.pgid,
    owned: false,
  })
  const snapshotError = new Error('full snapshot unavailable after descendant claim')
  const livePids = new Set([root.pid, listener.pid])
  const signals = []
  let snapshotCalls = 0
  let currentTime = 0

  const tracker = new PosixOwnedProcessTracker(root.pid, 'owner=test', {
    readSnapshot: async () => {
      snapshotCalls += 1
      if (snapshotCalls > 1) throw snapshotError
      return new Map([
        [root.pid, root],
        [listener.pid, listener],
      ])
    },
    readIdentities: async pids => new Map(
      pids
        .filter(pid => livePids.has(pid))
        .map(pid => [pid, pid === root.pid ? root : listener]),
    ),
    signalProcess(pid, signal) {
      signals.push({ pid, signal })
      if (signal === 'SIGKILL') livePids.delete(pid)
    },
    now: () => currentTime,
    wait: async milliseconds => {
      currentTime += milliseconds
    },
    setIntervalFn: inertInterval,
    clearIntervalFn() {},
    settleDelayMs: 0,
    wrapperPid: 91_001,
  })

  try {
    await tracker.start()
    livePids.delete(root.pid)
    await assert.rejects(
      stopOwnedProcessTree(tracker, 'SIGTERM', 50, 50),
      error => error.cause === snapshotError,
    )
  } finally {
    tracker.stop()
  }

  assert.deepEqual(signals, [
    { pid: listener.pid, signal: 'SIGTERM' },
    { pid: listener.pid, signal: 'SIGKILL' },
  ])
  assert.equal(livePids.has(listener.pid), false)
})

test('cached validation keeps successful PID chunks when another chunk fails', async () => {
  const entries = Array.from({ length: 130 }, (_, index) => ownedProcessEntry({
    pid: 42_000 + index,
    pgid: 42_000 + index,
    startedAt: `Thu Jul 23 18:00:${String(index % 60).padStart(2, '0')} 2026`,
  }))
  const snapshotError = new Error('full snapshot unavailable')
  const chunkError = new Error('injected second PID chunk failure')
  const livePids = new Set(entries.map(entry => entry.pid))
  const signals = []
  let snapshotCalls = 0

  const tracker = new PosixOwnedProcessTracker(entries[0].pid, 'owner=test', {
    readSnapshot: async () => {
      snapshotCalls += 1
      if (snapshotCalls > 1) throw snapshotError
      return new Map(entries.map(entry => [entry.pid, entry]))
    },
    readIdentities: async () => ({
      snapshot: new Map(
        entries
          .slice(0, 128)
          .filter(entry => livePids.has(entry.pid))
          .map(entry => [entry.pid, entry]),
      ),
      errors: [chunkError],
    }),
    signalProcess(pid, signal) {
      signals.push({ pid, signal })
      if (signal === 'SIGKILL') livePids.delete(pid)
    },
    now: () => 0,
    wait: async () => {},
    setIntervalFn: inertInterval,
    clearIntervalFn() {},
    settleDelayMs: 0,
    wrapperPid: 91_001,
  })

  try {
    await tracker.start()
    await assert.rejects(
      stopOwnedProcessTree(tracker, 'SIGTERM', 0, 0),
      error => error.cause === snapshotError,
    )
  } finally {
    tracker.stop()
  }

  assert.equal(signals.filter(({ signal }) => signal === 'SIGTERM').length, 128)
  assert.equal(signals.filter(({ signal }) => signal === 'SIGKILL').length, 128)
  assert.equal(livePids.size, 2)
  assert.deepEqual(
    [...livePids].sort((left, right) => left - right),
    entries.slice(128).map(entry => entry.pid),
  )
})

for (const [changedIdentity, identityChanges] of [
  ['start time', { startedAt: 'Thu Jul 23 18:00:01 2026' }],
  ['UID', { uid: 502 }],
]) {
  test(`snapshot fallback refuses a cached PID whose ${changedIdentity} changed`, async () => {
    const entry = ownedProcessEntry()
    const snapshotError = new Error('snapshot unavailable after initial validation')
    const signalledPids = []
    let snapshotCalls = 0

    const tracker = new PosixOwnedProcessTracker(entry.pid, 'owner=test', {
      readSnapshot: async () => {
        snapshotCalls += 1
        if (snapshotCalls > 1) throw snapshotError
        return new Map([[entry.pid, entry]])
      },
      readIdentities: async () => new Map([[
        entry.pid,
        { ...entry, ...identityChanges },
      ]]),
      signalProcess(pid) {
        signalledPids.push(pid)
      },
      now: () => 0,
      wait: async () => {},
      setIntervalFn: inertInterval,
      clearIntervalFn() {},
      settleDelayMs: 0,
      wrapperPid: 91_001,
    })

    try {
      await tracker.start()
      await assert.rejects(
        stopOwnedProcessTree(tracker, 'SIGTERM', 0, 0),
        error => error.cause === snapshotError,
      )
    } finally {
      tracker.stop()
    }

    assert.deepEqual(signalledPids, [])
  })
}

test('steady-state process snapshots stay materially below ten per second', async () => {
  let markerSnapshotCalls = 0
  let topologySnapshotCalls = 0
  let timer
  let timerCleared = false
  const tracker = new PosixOwnedProcessTracker(41_001, 'owner=test', {
    readMarkerSnapshot: async () => {
      markerSnapshotCalls += 1
      return new Map()
    },
    readTopologySnapshot: async () => {
      topologySnapshotCalls += 1
      return new Map()
    },
    setIntervalFn: (callback, milliseconds) => {
      timer = inertInterval(callback, milliseconds)
      return timer
    },
    clearIntervalFn(handle) {
      assert.equal(handle, timer)
      timerCleared = true
    },
    settleDelayMs: 0,
  })

  await tracker.start()
  const tenMinutesMs = 10 * 60 * 1_000
  const scheduledPolls = Math.floor(tenMinutesMs / timer.milliseconds)
  for (let index = 0; index < scheduledPolls; index += 1) {
    timer.callback()
    await new Promise(resolve => setImmediate(resolve))
  }
  tracker.stop()

  assert.equal(timer.milliseconds, POSIX_OWNERSHIP_POLL_INTERVAL_MS)
  assert.equal(markerSnapshotCalls, 1)
  assert.equal(topologySnapshotCalls, scheduledPolls)
  assert.ok(markerSnapshotCalls + topologySnapshotCalls < tenMinutesMs / 1_000)
  assert.ok(markerSnapshotCalls + topologySnapshotCalls < tenMinutesMs / 100 / 10)
  assert.equal(timerCleared, true)
})

test('bounded cleanup performs one sparse marker scan then topology-only polls', async () => {
  const entry = ownedProcessEntry()
  let markerSnapshotCalls = 0
  let topologySnapshotCalls = 0
  let currentTime = 0
  let alive = true
  const tracker = new PosixOwnedProcessTracker(entry.pid, 'owner=test', {
    readMarkerSnapshot: async () => {
      markerSnapshotCalls += 1
      return new Map(alive ? [[entry.pid, entry]] : [])
    },
    readTopologySnapshot: async () => {
      topologySnapshotCalls += 1
      return new Map(alive
        ? [[entry.pid, { ...entry, owned: false }]]
        : [])
    },
    signalProcess(pid, signal) {
      assert.equal(pid, entry.pid)
      if (signal === 'SIGKILL') alive = false
    },
    now: () => currentTime,
    wait: async milliseconds => {
      currentTime += milliseconds
    },
    setIntervalFn: inertInterval,
    clearIntervalFn() {},
    settleDelayMs: 0,
    wrapperPid: 91_001,
  })

  try {
    await tracker.start()
    await stopOwnedProcessTree(tracker, 'SIGTERM', 50, 50)
  } finally {
    tracker.stop()
  }

  assert.equal(markerSnapshotCalls, 4)
  assert.equal(topologySnapshotCalls, 2)
  assert.equal(alive, false)
})

test('final marker rescan catches a detached child forked after TERM discovery', async () => {
  const root = ownedProcessEntry({ pid: 65_001, pgid: 65_001 })
  const lateChild = ownedProcessEntry({
    pid: 65_002,
    ppid: 1,
    pgid: 65_002,
  })
  const livePids = new Set([root.pid])
  const signals = []
  let currentTime = 0

  const tracker = new PosixOwnedProcessTracker(root.pid, 'owner=test', {
    readMarkerSnapshot: async () => new Map(
      [...livePids].map(pid => [
        pid,
        pid === root.pid ? root : lateChild,
      ]),
    ),
    readTopologySnapshot: async () => new Map(
      livePids.has(lateChild.pid)
        ? [[lateChild.pid, { ...lateChild, owned: false }]]
        : [],
    ),
    signalProcess(pid, signal) {
      signals.push({ pid, signal })
      if (pid === root.pid && signal === 'SIGTERM') {
        livePids.delete(root.pid)
        livePids.add(lateChild.pid)
      }
      if (pid === lateChild.pid && signal === 'SIGKILL') {
        livePids.delete(lateChild.pid)
      }
    },
    now: () => currentTime,
    wait: async milliseconds => {
      currentTime += milliseconds
    },
    setIntervalFn: inertInterval,
    clearIntervalFn() {},
    settleDelayMs: 0,
    wrapperPid: 91_001,
  })

  try {
    await tracker.start()
    await stopOwnedProcessTree(tracker, 'SIGTERM', 50, 50)
  } finally {
    tracker.stop()
  }

  assert.deepEqual(signals, [
    { pid: root.pid, signal: 'SIGTERM' },
    { pid: lateChild.pid, signal: 'SIGTERM' },
    { pid: lateChild.pid, signal: 'SIGKILL' },
  ])
  assert.equal(livePids.size, 0)
})

test('Windows refuses to launch without durable Job Object containment', async () => {
  await assertWindowsContainmentRefusal()
})

test('an atomic contained-launch provider is the sole Windows launch authority', async () => {
  const completion = deferred()
  const events = []
  let stopped = false
  const tracker = {
    async start() {
      events.push('start')
      completion.resolve({ code: 17, signal: null })
    },
    async signalAndWait(signal) {
      events.push(`cleanup:${signal}`)
      return true
    },
    cleanupError() {
      return null
    },
    describe() {
      return 'fake contained session'
    },
    stop() {
      assert.equal(stopped, false)
      stopped = true
      events.push('stop')
    },
  }

  const outcome = await runSupervisedProcess('provider-owned.exe', ['--test'], {
    stdio: 'ignore',
    processOperations: {
      platform: 'win32',
      async launchContainedProcess(specification) {
        events.push('launch')
        assert.equal(specification.command, 'provider-owned.exe')
        assert.deepEqual(specification.args, ['--test'])
        specification.registerRollback(async () => {
          events.push('rollback')
        })
        return {
          completion: completion.promise,
          tracker,
          async dispose() {
            events.push('dispose')
          },
        }
      },
      spawnProcess() {
        throw new Error('Legacy spawn path must not run')
      },
      createTracker() {
        throw new Error('Post-spawn tracker path must not run')
      },
    },
  })

  assert.deepEqual(outcome, { code: 17, signal: null })
  assert.deepEqual(events, [
    'launch',
    'start',
    'cleanup:SIGTERM',
    'stop',
    'dispose',
  ])
})

test('an atomic provider is disposed when contained cleanup fails', async () => {
  const completion = deferred()
  const cleanupError = new Error('contained cleanup failed')
  const events = []
  const tracker = {
    async start() {
      events.push('start')
      completion.resolve({ code: 0, signal: null })
    },
    async signalAndWait() {
      events.push('cleanup')
      throw cleanupError
    },
    stop() {
      events.push('stop')
    },
  }

  await assert.rejects(
    runSupervisedProcess('provider-owned.exe', [], {
      stdio: 'ignore',
      processOperations: {
        platform: 'win32',
        signalEmitter: new EventEmitter(),
        async launchContainedProcess(specification) {
          events.push('launch')
          specification.registerRollback(async () => {
            events.push('rollback')
          })
          return {
            completion: completion.promise,
            tracker,
            async dispose() {
              events.push('dispose')
            },
          }
        },
      },
    }),
    error => error === cleanupError,
  )

  assert.deepEqual(events, [
    'launch',
    'start',
    'cleanup',
    'stop',
    'dispose',
  ])
})

test('an invalid atomic provider result invokes its pre-registered rollback', async () => {
  const events = []
  await assert.rejects(
    runSupervisedProcess('provider-owned.exe', [], {
      stdio: 'ignore',
      processOperations: {
        platform: 'win32',
        signalEmitter: new EventEmitter(),
        async launchContainedProcess(specification) {
          events.push('launch')
          specification.registerRollback(async () => {
            events.push('rollback')
          })
          return null
        },
      },
    }),
    /must roll back before rejecting/,
  )

  assert.deepEqual(events, ['launch', 'rollback'])
})

test('a malformed atomic provider handoff prefers registered rollback over dispose', async () => {
  const events = []
  await assert.rejects(
    runSupervisedProcess('provider-owned.exe', [], {
      stdio: 'ignore',
      processOperations: {
        platform: 'win32',
        signalEmitter: new EventEmitter(),
        async launchContainedProcess(specification) {
          events.push('launch')
          specification.registerRollback(async () => {
            events.push('rollback')
          })
          return {
            async dispose() {
              events.push('dispose')
            },
          }
        },
      },
    }),
    /must return completion, tracker, and dispose/,
  )

  assert.deepEqual(events, ['launch', 'rollback'])
})

test('a throwing atomic provider runs rollback registered before target creation', async () => {
  const launchError = new Error('provider failed after creating a suspended target')
  const events = []
  await assert.rejects(
    runSupervisedProcess('provider-owned.exe', [], {
      stdio: 'ignore',
      processOperations: {
        platform: 'win32',
        signalEmitter: new EventEmitter(),
        async launchContainedProcess(specification) {
          events.push('launch')
          specification.registerRollback(async () => {
            events.push('rollback')
          })
          throw launchError
        },
      },
    }),
    error => error === launchError,
  )

  assert.deepEqual(events, ['launch', 'rollback'])
})

test('an atomic provider cannot hand off without pre-registering rollback', async () => {
  const events = []
  const tracker = {
    async start() {},
    async signalAndWait() {
      return true
    },
    stop() {},
  }

  await assert.rejects(
    runSupervisedProcess('provider-owned.exe', [], {
      stdio: 'ignore',
      processOperations: {
        platform: 'win32',
        signalEmitter: new EventEmitter(),
        async launchContainedProcess() {
          events.push('launch')
          return {
            completion: Promise.resolve({ code: 0, signal: null }),
            tracker,
            async dispose() {
              events.push('dispose')
            },
          }
        },
      },
    }),
    /must register rollback before spawning/,
  )

  assert.deepEqual(events, ['launch', 'dispose'])
})

test('startup, tracker-stop, and provider-dispose failures preserve the startup cause', async () => {
  const startError = new Error('provider tracker start failed')
  const stopError = new Error('provider tracker stop failed')
  const disposeError = new Error('provider dispose failed')
  const events = []
  const tracker = {
    async start() {
      events.push('start')
      throw startError
    },
    async signalAndWait() {
      events.push('cleanup')
      return true
    },
    cleanupError() {
      return null
    },
    describe() {
      return 'failing provider tracker'
    },
    stop() {
      events.push('stop')
      throw stopError
    },
  }

  await assert.rejects(
    runSupervisedProcess('provider-owned.exe', [], {
      stdio: 'ignore',
      processOperations: {
        platform: 'win32',
        signalEmitter: new EventEmitter(),
        async launchContainedProcess(specification) {
          events.push('launch')
          specification.registerRollback(async () => {
            events.push('rollback')
          })
          return {
            completion: new Promise(() => {}),
            tracker,
            async forceRootExit() {
              events.push('force-root')
            },
            async dispose() {
              events.push('dispose')
              throw disposeError
            },
          }
        },
      },
    }),
    error => {
      assert.ok(error instanceof AggregateError)
      assert.equal(error.cause, startError)
      assert.equal(error.errors[1], disposeError)
      assert.ok(error.errors[0] instanceof AggregateError)
      assert.equal(error.errors[0].cause, startError)
      assert.ok(error.errors[0].errors.includes(stopError))
      return true
    },
  )

  assert.deepEqual(events, [
    'launch',
    'start',
    'stop',
    'force-root',
    'cleanup',
    'dispose',
  ])
})

test('completion and provider-dispose failures preserve the completion cause', async () => {
  const completionError = new Error('provider child completion failed')
  const disposeError = new Error('provider dispose failed')
  const events = []
  const tracker = {
    async start() {
      events.push('start')
    },
    async signalAndWait() {
      events.push('cleanup')
      return true
    },
    stop() {
      events.push('stop')
    },
  }

  await assert.rejects(
    runSupervisedProcess('provider-owned.exe', [], {
      stdio: 'ignore',
      processOperations: {
        platform: 'win32',
        signalEmitter: new EventEmitter(),
        async launchContainedProcess(specification) {
          events.push('launch')
          specification.registerRollback(async () => {
            events.push('rollback')
          })
          return {
            completion: Promise.reject(completionError),
            tracker,
            async dispose() {
              events.push('dispose')
              throw disposeError
            },
          }
        },
      },
    }),
    error => {
      assert.ok(error instanceof AggregateError)
      assert.equal(error.cause, completionError)
      assert.deepEqual(error.errors, [completionError, disposeError])
      return true
    },
  )

  assert.deepEqual(events, [
    'launch',
    'start',
    'cleanup',
    'stop',
    'dispose',
  ])
})

test('reports spawn errors without leaving an owned process', async () => {
  const outcome = await runSupervisedProcess(
    path.join(os.tmpdir(), `travelback-command-that-does-not-exist-${process.pid}`),
    [],
    { stdio: 'ignore' },
  )
  assert.ok(outcome.error instanceof Error)
})

test('reuses a live Next lock only when its endpoint carries the Travelback marker', async () => {
  const workingDirectory = await mkdtemp(path.join(os.tmpdir(), 'travelback-lock-'))
  try {
    await mkdir(path.join(workingDirectory, '.next/dev'), { recursive: true })
    await writeFile(
      path.join(workingDirectory, '.next/dev/lock'),
      JSON.stringify({ pid: process.pid, port: 3099 }),
    )

    const invalid = await readReusableNextDevLock({
      cwd: workingDirectory,
      fetchImpl: async () => new Response('<html><body>another app</body></html>', {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    })
    assert.equal(invalid, null)

    const valid = await readReusableNextDevLock({
      cwd: workingDirectory,
      fetchImpl: async () => new Response('<html data-svc="travelback"><body></body></html>', {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    })
    assert.deepEqual(valid, { pid: process.pid, port: 3099 })
  } finally {
    await rm(workingDirectory, { recursive: true, force: true })
  }
})
