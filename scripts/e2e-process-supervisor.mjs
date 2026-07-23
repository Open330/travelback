import { execFile, spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createServer as createTcpServer } from 'node:net'
import path from 'node:path'

const FORWARDED_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT']
const TRAVELBACK_MARKER = /\bdata-svc=(['"])travelback\1/i
const MARKER_READ_LIMIT = 64 * 1024
const PROCESS_TABLE_TIMEOUT_MS = 2_000

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

async function forceWindowsProcessTreeExit(pid) {
  await new Promise((resolve, reject) => {
    const taskkill = spawn(
      'taskkill.exe',
      ['/pid', String(pid), '/t', '/f'],
      { stdio: 'ignore', windowsHide: true },
    )
    taskkill.once('error', reject)
    taskkill.once('exit', code => {
      if (code === 0 || !isProcessAlive(pid)) {
        resolve()
        return
      }
      reject(new Error(`taskkill exited with code ${code ?? 'unknown'}`))
    })
  })
}

function readPosixProcessTable() {
  return new Promise((resolve, reject) => {
    execFile(
      'ps',
      ['-axo', 'pid=,ppid=,pgid=,lstart='],
      {
        encoding: 'utf8',
        env: { ...process.env, LC_ALL: 'C' },
        maxBuffer: 4 * 1024 * 1024,
        timeout: PROCESS_TABLE_TIMEOUT_MS,
        killSignal: 'SIGKILL',
      },
      (error, stdout) => {
        if (error) {
          reject(error)
          return
        }

        const snapshot = new Map()
        for (const line of stdout.split('\n')) {
          const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.+?)\s*$/)
          if (!match) continue
          const entry = {
            pid: Number(match[1]),
            ppid: Number(match[2]),
            pgid: Number(match[3]),
            startedAt: match[4],
          }
          snapshot.set(entry.pid, entry)
        }
        resolve(snapshot)
      },
    )
  })
}

class PosixOwnedProcessTracker {
  constructor(rootPid) {
    this.rootPid = rootPid
    this.knownProcesses = new Map()
    this.activeGroupTokens = new Map()
    this.previousActiveGroups = new Set()
    this.sentSignals = new Set()
    this.nextGroupGeneration = 1
    this.refreshPromise = null
    this.pollTimer = null
    this.wrapperPgid = null
  }

  async start() {
    await this.refresh()
    this.pollTimer = setInterval(() => {
      this.refresh().catch(() => {})
    }, 100)
    this.pollTimer.unref()
  }

  stop() {
    if (this.pollTimer) clearInterval(this.pollTimer)
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
    const snapshot = await readPosixProcessTable()
    this.wrapperPgid = snapshot.get(process.pid)?.pgid ?? this.wrapperPgid

    if (!this.knownProcesses.has(this.rootPid)) {
      const root = snapshot.get(this.rootPid)
      if (root) this.knownProcesses.set(root.pid, root.startedAt)
    }

    const activeOwnedPids = new Set()
    const activeOwnedGroups = new Set()
    for (const [pid, startedAt] of this.knownProcesses) {
      const current = snapshot.get(pid)
      if (!current || current.startedAt !== startedAt) continue
      activeOwnedPids.add(pid)
      activeOwnedGroups.add(current.pgid)
    }

    let discoveredProcess = true
    while (discoveredProcess) {
      discoveredProcess = false
      for (const current of snapshot.values()) {
        if (current.pid === process.pid || activeOwnedPids.has(current.pid)) continue
        if (!activeOwnedPids.has(current.ppid) && !activeOwnedGroups.has(current.pgid)) continue

        this.knownProcesses.set(current.pid, current.startedAt)
        activeOwnedPids.add(current.pid)
        activeOwnedGroups.add(current.pgid)
        discoveredProcess = true
      }
    }

    for (const pgid of activeOwnedGroups) {
      if (!this.previousActiveGroups.has(pgid)) {
        this.activeGroupTokens.set(pgid, `${pgid}:${this.nextGroupGeneration}`)
        this.nextGroupGeneration += 1
      }
    }
    for (const pgid of this.previousActiveGroups) {
      if (!activeOwnedGroups.has(pgid)) this.activeGroupTokens.delete(pgid)
    }
    this.previousActiveGroups = activeOwnedGroups

    return [...activeOwnedPids].map(pid => snapshot.get(pid))
  }

  signalGroupsOnce(liveProcesses, signal) {
    const groups = new Set(liveProcesses.map(entry => entry.pgid))
    for (const pgid of groups) {
      if (pgid <= 1 || pgid === this.wrapperPgid) {
        throw new Error(`Refusing to signal unsafe process group ${pgid}`)
      }

      const groupToken = this.activeGroupTokens.get(pgid)
      if (!groupToken) continue
      const signalKey = `${groupToken}:${signal}`
      if (this.sentSignals.has(signalKey)) continue

      try {
        process.kill(-pgid, signal)
      } catch (error) {
        if (!isMissingProcessError(error)) throw error
      }
      this.sentSignals.add(signalKey)
    }
  }

  async signalAndWait(signal, timeoutMs) {
    const deadline = Date.now() + timeoutMs
    while (true) {
      const liveProcesses = await this.refresh()
      if (liveProcesses.length === 0) return true
      this.signalGroupsOnce(liveProcesses, signal)
      if (Date.now() >= deadline) return false
      await delay(50)
    }
  }

  describe() {
    return `owned E2E descendants rooted at PID ${this.rootPid}`
  }
}

class WindowsOwnedProcessTracker {
  constructor(child) {
    this.child = child
    this.rootPid = child.pid
    this.sentSignals = new Set()
  }

  async start() {}

  stop() {}

  async signalAndWait(signal, timeoutMs) {
    if (!this.rootPid || !isProcessAlive(this.rootPid)) return true

    if (!this.sentSignals.has(signal)) {
      // taskkill's exact PID tree is the only reliable way to include browser
      // descendants before the Windows root exits and loses that relationship.
      await forceWindowsProcessTreeExit(this.rootPid)
      this.sentSignals.add(signal)
    }

    const deadline = Date.now() + timeoutMs
    while (isProcessAlive(this.rootPid)) {
      if (Date.now() >= deadline) return false
      await delay(50)
    }
    return true
  }

  describe() {
    return `owned E2E process tree rooted at PID ${this.rootPid}`
  }
}

async function stopOwnedProcessTree(tracker, initialSignal, gracePeriodMs, forceKillWaitMs) {
  if (await tracker.signalAndWait(initialSignal, gracePeriodMs)) return
  if (await tracker.signalAndWait('SIGKILL', forceKillWaitMs)) return
  throw new Error(`${tracker.describe()} survived forced termination`)
}

async function forceRootGroupExitAfterTrackingFailure(child) {
  if (!child.pid) return
  if (process.platform === 'win32') {
    await forceWindowsProcessTreeExit(child.pid).catch(() => {})
    return
  }
  try {
    process.kill(-child.pid, 'SIGKILL')
  } catch (error) {
    if (!isMissingProcessError(error)) throw error
  }
}

/**
 * Runs a command in its own POSIX process group and inventories descendants
 * that create their own groups (as Playwright browsers do). Wrapper signals
 * are relayed once to every exact owned group, followed by a bounded graceful
 * wait and exact-group escalation.
 */
export async function runSupervisedProcess(command, args, {
  cwd = process.cwd(),
  env = process.env,
  stdio = 'inherit',
  gracePeriodMs = 5_000,
  forceKillWaitMs = 2_000,
} = {}) {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio,
    detached: process.platform !== 'win32',
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

  const tracker = process.platform === 'win32'
    ? new WindowsOwnedProcessTracker(child)
    : new PosixOwnedProcessTracker(child.pid)

  try {
    try {
      await tracker.start()
    } catch (error) {
      await forceRootGroupExitAfterTrackingFailure(child)
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
