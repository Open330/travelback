import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
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
  const outcome = await runSupervisedProcess('must-not-run.exe', [], {
    stdio: 'ignore',
    processOperations: {
      platform: 'win32',
      spawnProcess() {
        spawned = true
        throw new Error('Windows target was launched without containment')
      },
    },
  })

  assert.equal(spawned, false)
  assert.ok(outcome.error instanceof UnsupportedProcessContainmentError)
  assert.match(outcome.error.message, /Job Object/)
}

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
  startedAt = 'Thu Jul 23 18:00:00 2026',
} = {}) {
  return { pid, ppid, pgid, startedAt, owned: true }
}

function inertInterval(callback, milliseconds) {
  return {
    callback,
    milliseconds,
    unref() {},
  }
}

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

test('snapshot fallback refuses a cached PID whose exact start identity changed', async () => {
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
      {
        ...entry,
        startedAt: 'Thu Jul 23 18:00:01 2026',
      },
    ]]),
    signalProcess(pid) {
      signalledPids.push(pid)
    },
    now: () => 0,
    wait: async () => {},
    setIntervalFn: inertInterval,
    clearIntervalFn() {},
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

test('steady-state process snapshots stay materially below ten per second', async () => {
  let snapshotCalls = 0
  let timer
  let timerCleared = false
  const tracker = new PosixOwnedProcessTracker(41_001, 'owner=test', {
    readSnapshot: async () => {
      snapshotCalls += 1
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
  assert.equal(snapshotCalls, scheduledPolls + 1)
  assert.ok(snapshotCalls < tenMinutesMs / 1_000)
  assert.ok(snapshotCalls < tenMinutesMs / 100 / 10)
  assert.equal(timerCleared, true)
})

test('Windows refuses to launch without durable Job Object containment', async () => {
  await assertWindowsContainmentRefusal()
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
