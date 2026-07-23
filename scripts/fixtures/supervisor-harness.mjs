import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  exitLikeSupervisedProcess,
  runSupervisedProcess,
} from '../e2e-process-supervisor.mjs'

const [, , mode, stateDirectory] = process.argv
if (!mode || !stateDirectory) {
  throw new Error('Usage: supervisor-harness.mjs <mode> <state-directory>')
}

const fixturePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fake-process-tree.mjs')
const outcome = await runSupervisedProcess(
  process.execPath,
  [fixturePath, 'root', mode, stateDirectory],
  {
    gracePeriodMs: Number(process.env.SUPERVISOR_GRACE_MS ?? '250'),
    forceKillWaitMs: Number(process.env.SUPERVISOR_KILL_WAIT_MS ?? '1_000'),
  },
)

exitLikeSupervisedProcess(outcome)
