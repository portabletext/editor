import {describe, expect, test, vi} from 'vitest'
import {Device} from './u2.ts'
import {runAbortable} from './util.ts'

const device = vi.hoisted(() => {
  let releaseShell!: () => void
  let shellEntered!: () => void
  return {
    shellGate: new Promise<void>((resolve) => {
      releaseShell = resolve
    }),
    shellPending: new Promise<void>((resolve) => {
      shellEntered = resolve
    }),
    releaseShell: () => releaseShell(),
    shellEntered: () => shellEntered(),
    services: [] as string[],
    closed: [] as string[],
    pings: 0,
  }
})

vi.mock(import('node:fs'), async (importOriginal) => ({
  ...(await importOriginal()),
  existsSync: () => true,
  readFileSync: (() => Buffer.from('jar')) as never,
}))

vi.mock(import('node:crypto'), async (importOriginal) => ({
  ...(await importOriginal()),
  createHash: (() => ({
    update() {
      return this
    },
    digest: () => '87c8ac9505970d42aa5922baa90114808fda6f47f9e5fbd4caa0f621c2c8d30d',
  })) as never,
}))

vi.mock(import('./adb.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  adb: async () => '',
  deviceShell: async () => {
    device.shellEntered()
    await device.shellGate
    return '87c8ac9505970d42aa5922baa90114808fda6f47f9e5fbd4caa0f621c2c8d30d'
  },
  AdbConnection: {
    service: async (service: string) => {
      device.services.push(service)
      return {
        socket: {write() {}, unref() {}, setTimeout() {}},
        stream() {},
        close() {
          device.closed.push(service)
        },
        closed: false,
        readUntil: async () =>
          Buffer.from(++device.pings === 1 ? 'HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nno' : 'HTTP/1.1 200 OK\r\nContent-Length: 4\r\n\r\npong'),
      }
    },
  } as never,
}))

describe(Device.connect.name, () => {
  test('an attempt aborted while the jar check is pending opens no connection to the device', async () => {
    const controller = new AbortController()
    const connecting = runAbortable(controller.signal, () => Device.connect())
    await device.shellPending

    controller.abort(new Error('attempt timed out'))
    device.releaseShell()

    await expect(connecting).rejects.toThrow('attempt timed out')
    expect({services: device.services, closed: device.closed}).toEqual({services: [], closed: []})
  })
})
