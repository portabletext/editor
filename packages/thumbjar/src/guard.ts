import {KILL_GRACE_SECONDS} from './device/budget.ts'
import {killGroup, runChildProcess, type ChildOptions} from './process-child.ts'

if (process.send === undefined) {
  process.stderr.write('thumbjar guard must be started by thumbjar\n')
  process.exit(2)
}

const {
  command,
  args,
  seconds,
  killAfter,
}: {
  command: string
  args: string[]
  seconds?: number
  killAfter: number
} = JSON.parse(process.argv[2]!)
const controller = new AbortController()
const options: ChildOptions = {
  ...(seconds === undefined ? {} : {seconds}),
  killAfter,
  killWait: KILL_GRACE_SECONDS,
  signal: controller.signal,
  groupPid: process.pid,
  output: 'inherit',
  release: true,
}
const stop = (grace: number) => {
  options.killAfter = Math.min(options.killAfter, grace)
  controller.abort()
}
process.on('SIGTERM', () => {})
process.on('SIGINT', () => {})
process.on('disconnect', () => stop(killAfter))
process.on('message', (message: {killAfter: number}) => stop(message.killAfter))
if (!process.connected) {
  stop(killAfter)
}
const result = await runChildProcess(command, args, options)
if (result.error) {
  process.stderr.write(`${result.error.message}\n`)
}
// The guard shares its group with the stage so killing the guard also ends descendants holding its pipes.
if (process.connected) {
  process.send?.({status: result.status}, () =>
    killGroup(process.pid, 'SIGKILL'),
  )
} else {
  killGroup(process.pid, 'SIGKILL')
}
