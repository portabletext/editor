import {writeFileSync, appendFileSync} from 'node:fs'
import {COMMAND_KILL_SECONDS} from '../device/budget.ts'
import {execute} from '../process.ts'

const file = process.argv[3]!
writeFileSync(file, '')
const output = (chunk: Buffer) => appendFileSync(file, chunk)
await execute('adb', ['logcat', '-v', 'time'], {
  seconds: Number(process.argv[2]),
  killAfter: COMMAND_KILL_SECONDS,
  group: false,
  collect: false,
  stdout: output,
  stderr: output,
})
