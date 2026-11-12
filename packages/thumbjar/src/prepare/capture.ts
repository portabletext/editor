import {setTimeout as delay} from 'node:timers/promises'
import {
  COMMAND_KILL_SECONDS,
  CAPTURE_WAIT_SECONDS,
  CAPTURE_RETRY_SECONDS,
} from '../device/budget.ts'
import {execute, termination} from '../process.ts'

const stop = termination()
try {
  while (true) {
    stop.signal.throwIfAborted()
    process.stdout.write(
      `CAPTURE_SEGMENT start ${Math.floor(Date.now() / 1000)}\n`,
    )
    await execute('adb', ['logcat', '-v', 'epoch', '-b', 'main'], {
      killAfter: COMMAND_KILL_SECONDS,
      group: false,
      collect: false,
      signal: stop.signal,
      stdout: (chunk) => process.stdout.write(chunk),
      stderr: (chunk) => process.stderr.write(chunk),
    })
    await execute('adb', ['wait-for-device'], {
      seconds: CAPTURE_WAIT_SECONDS,
      killAfter: COMMAND_KILL_SECONDS,
      group: false,
      collect: false,
      signal: stop.signal,
      stdout: (chunk) => process.stdout.write(chunk),
      stderr: (chunk) => process.stderr.write(chunk),
    })
    await delay(CAPTURE_RETRY_SECONDS * 1000, undefined, {signal: stop.signal})
  }
} catch (error) {
  if (!stop.signal.aborted) {
    throw error
  }
  process.exitCode = stop.status()
} finally {
  stop.dispose()
}
