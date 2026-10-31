import {EventEmitter} from 'node:events'
import {PassThrough} from 'node:stream'
import {vi} from 'vitest'

const device = vi.hoisted(() => ({attempts: 0, spawned: [] as string[]}))

// The first adb process never closes, whatever it is sent. Every later one exits at once.
vi.mock(import('node:child_process'), async (importOriginal) => ({
  ...(await importOriginal()),
  spawn: ((file: string, args: string[]) => {
    device.spawned.push(`${file} ${args.join(' ')}`)
    const child = Object.assign(new EventEmitter(), {
      pid: 4242,
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      kill: () => true,
    })
    if (device.spawned.length > 1) {
      queueMicrotask(() => child.emit('close', 0))
    }
    return child
  }) as never,
}))

vi.mock(import('../../gboard/typing.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  typeInChrome: () => {
    device.attempts += 1
    if (globalThis.firstAttemptFaults && device.attempts === 1) {
      return Promise.reject(new Error('Gboard window did not appear'))
    }
    return Promise.resolve({
      text: 'ｋ用今日',
      picked: ['今日'],
      compositionstart: 2,
      nested: 1,
      compositionstartPerWord: [2],
    })
  },
  dumpFailure: async () => {},
}))

declare global {
  var firstAttemptFaults: boolean
  var typingAttempts: () => number
}
globalThis.typingAttempts = () => device.attempts
