import { spawn } from 'node:child_process'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const [, , role, stateDirectory, profileDirectory, listenerToken] = process.argv
const fixturePath = fileURLToPath(import.meta.url)

if (
  !['root', 'browser-host'].includes(role)
  || !stateDirectory
  || !profileDirectory
  || !listenerToken
) {
  throw new Error(
    'Usage: real-chromium-failure.mjs <root|browser-host> '
      + '<state-directory> <profile-directory> <listener-token>',
  )
}

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

async function waitForRelease() {
  const releasePath = path.join(stateDirectory, 'release')
  while (true) {
    try {
      await readFile(releasePath)
      return
    } catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT') {
        throw error
      }
      await delay(20)
    }
  }
}

async function waitForChromiumProfileLocks() {
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline) {
    const lockNames = (await readdir(profileDirectory, { recursive: true }))
      .filter(name => (
        path.basename(name) === 'LOCK'
        || path.basename(name).startsWith('Singleton')
      ))
    if (lockNames.length > 0) {
      return lockNames.map(name => path.join(profileDirectory, name))
    }
    await delay(20)
  }
  throw new Error(`Chromium did not create a profile lock in ${profileDirectory}`)
}

async function runBrowserHost() {
  // The supervisor, rather than Playwright's Node signal hook, must prove it
  // can reap this deliberately stubborn host and the browser it launched.
  process.on('SIGTERM', () => {})
  process.on('SIGINT', () => {})

  const responseBody = `travelback-supervisor-listener:${listenerToken}`
  const server = createServer(socket => {
    socket.end(
      'HTTP/1.1 200 OK\r\n'
        + 'Content-Type: text/plain; charset=utf-8\r\n'
        + `Content-Length: ${Buffer.byteLength(responseBody)}\r\n`
        + 'Connection: close\r\n'
        + '\r\n'
        + responseBody,
    )
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen({ host: '127.0.0.1', port: 0, exclusive: true }, resolve)
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Fixture listener did not expose a TCP port')
  }

  const context = await chromium.launchPersistentContext(profileDirectory, {
    headless: true,
    handleSIGHUP: false,
    handleSIGINT: false,
    handleSIGTERM: false,
  })
  const page = context.pages()[0] ?? await context.newPage()
  const response = await page.goto(`http://127.0.0.1:${address.port}/`)
  if (!response || await response.text() !== responseBody) {
    throw new Error('Chromium could not reach the fixture listener')
  }

  process.send?.({
    type: 'ready',
    browserHostPid: process.pid,
    browserVersion: context.browser()?.version() ?? null,
    listenerPort: address.port,
    profileLocks: await waitForChromiumProfileLocks(),
  })

  await new Promise(() => {})
}

async function runRoot() {
  const browserHost = spawn(
    process.execPath,
    [
      fixturePath,
      'browser-host',
      stateDirectory,
      profileDirectory,
      listenerToken,
    ],
    {
      env: process.env,
      stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
    },
  )

  const ready = await new Promise((resolve, reject) => {
    browserHost.once('error', reject)
    browserHost.once('exit', (code, signal) => {
      reject(new Error(
        `Browser host exited before readiness (code=${code}, signal=${signal})`,
      ))
    })
    browserHost.once('message', message => {
      if (message?.type === 'ready') resolve(message)
    })
  })

  await writeFile(
    path.join(stateDirectory, 'state.json'),
    JSON.stringify({
      rootPid: process.pid,
      listenerToken,
      ...ready,
    }),
  )
  await waitForRelease()

  // Abrupt nonzero completion intentionally leaves the stubborn host and its
  // real Chromium tree for the owning supervisor to terminate.
  process.exit(23)
}

try {
  if (role === 'browser-host') {
    await runBrowserHost()
  } else {
    await runRoot()
  }
} catch (error) {
  const detail = error instanceof Error ? error.stack ?? error.message : String(error)
  await writeFile(path.join(stateDirectory, `${role}-error.txt`), detail)
  process.exit(70)
}
