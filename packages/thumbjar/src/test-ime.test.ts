import {beforeEach, expect, test, vi} from 'vitest'
import {adb} from './device/adb.ts'
import {ime} from './test-ime.ts'

vi.mock('./device/adb.ts', () => ({adb: vi.fn()}))

beforeEach(() => {
  vi.mocked(adb).mockReset()
  vi.mocked(adb).mockResolvedValue('Broadcast completed: result=0, data="ok"')
})

test('encodes text before crossing the Android shell', async () => {
  expect(await ime.compose('foo bar')).toEqual('ok')
  expect(vi.mocked(adb).mock.calls).toEqual([
    [
      [
        'shell',
        'am',
        'broadcast',
        '-a',
        'org.slatejs.testime.COMMAND',
        '--es',
        'op',
        'compose',
        '--es',
        'b64',
        'Zm9vIGJhcg==',
      ],
    ],
  ])
})

test('retains rejected offset operations as discovery results', async () => {
  vi.mocked(adb).mockResolvedValue(
    'Broadcast completed: result=0, data="error:rejected"',
  )
  expect(await ime.region(-8, 1000)).toEqual('error:rejected')
  expect(vi.mocked(adb).mock.calls).toEqual([
    [
      [
        'shell',
        'am',
        'broadcast',
        '-a',
        'org.slatejs.testime.COMMAND',
        '--es',
        'op',
        'region',
        '--ei',
        'a',
        '-8',
        '--ei',
        'b',
        '1000',
      ],
    ],
  ])
})

test('rejects broadcasts without an input connection', async () => {
  vi.mocked(adb).mockResolvedValue(
    'Broadcast completed: result=0, data="error:no-input-connection"',
  )
  await expect(ime.finish()).rejects.toThrow(
    'test IME finish: error:no-input-connection',
  )
})
