import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  readReusableNextDevLock,
  runSupervisedProcess,
} from './e2e-process-supervisor.mjs'

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(scriptsDirectory, 'fixtures/fake-process-tree.mjs')
const harnessPath = path.join(scriptsDirectory, 'fixtures/supervisor-harness.mjs')
const isPosix = process.platform !== 'win32'

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

test('preserves normal and nonzero child exits and reaps their process trees', { skip: !isPosix }, async () => {
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

test('reaps a detached stubborn grandchild after its direct child exits normally', { skip: !isPosix }, async () => {
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

for (const signal of ['SIGINT', 'SIGTERM']) {
  test(`forwards ${signal}, preserves signal status, and leaves an unrelated sentinel alive`, { skip: !isPosix }, async () => {
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

test('escalates only the stubborn owned process group and ignores repeated wrapper signals', { skip: !isPosix }, async () => {
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
