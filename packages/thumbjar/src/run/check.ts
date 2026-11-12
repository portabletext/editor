import {spawnSync} from 'node:child_process'
import {appendFileSync} from 'node:fs'
import {deviceVerdict} from '../device/adb.ts'

const adb = spawnSync('adb', ['get-state'], {
  encoding: 'utf8',
  timeout: 5_000,
  killSignal: 'SIGKILL',
})
const verdict = deviceVerdict({
  stdout: adb.stdout ?? '',
  stderr: adb.stderr ?? '',
  timedOut: adb.error !== undefined,
})
if (verdict === undefined) {
  process.exitCode = 1
} else {
  appendFileSync(
    process.argv[2]!,
    `CHECKED ${verdict} at ${Math.floor(Date.now() / 1000)}\n`,
  )
  process.stdout.write(`${verdict}\n`)
}
