import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const [, , role, mode, stateDirectory] = process.argv
const fixturePath = fileURLToPath(import.meta.url)

if (!role || !mode || !stateDirectory) {
  throw new Error('Usage: fake-process-tree.mjs <root|grandchild> <mode> <state-directory>')
}

mkdirSync(stateDirectory, { recursive: true })

function record(name, value = String(process.pid)) {
  writeFileSync(path.join(stateDirectory, name), value)
}

function installSignalRecorders({ ignore }) {
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      record(`${role}-${signal}`)
      if (!ignore) process.exit(0)
    })
  }
}

if (role === 'grandchild') {
  record('grandchild-ready')
  process.send?.({ type: 'ready', pid: process.pid })

  if (mode === 'normal' || mode === 'nonzero') {
    setTimeout(() => process.exit(0), 50)
  } else {
    installSignalRecorders({ ignore: mode.includes('stubborn') })
    setInterval(() => {}, 1_000)
  }
} else if (role === 'root') {
  const grandchild = spawn(
    process.execPath,
    [fixturePath, 'grandchild', mode, stateDirectory],
    {
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
    },
  )

  grandchild.once('message', message => {
    if (message?.type !== 'ready') return
    record('tree.json', JSON.stringify({
      rootPid: process.pid,
      grandchildPid: message.pid,
    }))
    if (mode === 'orphan-stubborn') {
      setTimeout(() => process.exit(0), 250)
    }
  })
  grandchild.once('error', error => {
    record('root-error', error.message)
    process.exit(70)
  })
  grandchild.once('exit', () => {
    process.exit(mode === 'nonzero' ? 23 : 0)
  })

  if (mode === 'wait' || mode === 'stubborn') {
    installSignalRecorders({ ignore: true })
  }
} else {
  throw new Error(`Unknown fake process role: ${role}`)
}
