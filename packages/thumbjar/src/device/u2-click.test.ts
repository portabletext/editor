import {describe, expect, test, vi} from 'vitest'
import {Device} from './u2.ts'

const server = vi.hoisted(() => ({clickResult: true as boolean, requests: [] as string[]}))

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
  deviceShell: async () => '87c8ac9505970d42aa5922baa90114808fda6f47f9e5fbd4caa0f621c2c8d30d',
  AdbConnection: {
    service: async () => {
      let request = ''
      return {
        socket: {
          write(data: string) {
            request = data
            server.requests.push(data.split('\r\n')[0]!)
          },
          unref() {},
          setTimeout() {},
        },
        stream() {},
        close() {},
        closed: false,
        readUntil: async () => {
          const body = request.startsWith('GET /ping') ? 'pong' : JSON.stringify({jsonrpc: '2.0', id: 1, result: server.clickResult})
          return Buffer.from(`HTTP/1.1 200 OK\r\nContent-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`)
        },
      }
    },
  } as never,
}))

describe(Device.prototype.click.name, () => {
  test('a tap the system accepted resolves', async () => {
    server.clickResult = true
    const device = await Device.connect()

    await expect(device.click(10, 20)).resolves.toEqual(undefined)
  })

  test('a tap the system rejected throws, so the attempt fails as a driver fault', async () => {
    server.clickResult = false
    const device = await Device.connect()

    await expect(device.click(10, 20)).rejects.toThrow('tap at 10,20 was not injected')
  })
})
