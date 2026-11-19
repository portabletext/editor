import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import {GLOBAL_SETUP_ADB_SECONDS, JOIN_GRACE_SECONDS} from '../device/budget.ts'
import globalSetup from './global-setup.ts'

// Half a second instead of 30. The typed `vi.mock(import(...))` form rejects it, as the export's type
// is the literal 30.
vi.mock('../device/budget.ts', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  GLOBAL_SETUP_ADB_SECONDS: 0.5,
}))

const {resolvePeer} = vi.hoisted(() => ({resolvePeer: vi.fn()}))
vi.mock('node:module', () => ({
  createRequire: () => ({resolve: resolvePeer}),
}))

let directory: string
const leftRunning: number[] = []

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'thumbjar-global-setup-'))
  vi.stubEnv('PATH', `${directory}:${process.env.PATH}`)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  resolvePeer.mockReset()
  for (const pid of leftRunning.splice(0)) {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {}
  }
  rmSync(directory, {recursive: true, force: true})
})

describe('the global setup', () => {
  test('names the iOS prerequisites when webdriverio is missing', async () => {
    resolvePeer.mockImplementation(() => {
      throw new Error('module missing')
    })
    await expect(
      globalSetup({
        getProvidedContext: () => ({
          thumbjarDevice: 'ios',
          thumbjarPageUrl: 'http://localhost:8765/editor.html',
          thumbjarPageHint: 'Serve it.',
        }),
      }),
    ).rejects.toThrow(
      'iOS needs the optional `webdriverio` peer dependency and an Appium XCUITest server on port 4723, see the thumbjar README.',
    )
  })

  test('names the iOS prerequisites when Appium is unavailable', async () => {
    resolvePeer.mockReturnValue('/webdriverio/index.js')
    const request = vi.fn().mockRejectedValue(new Error('connection refused'))
    vi.stubGlobal('fetch', request)
    await expect(
      globalSetup({
        getProvidedContext: () => ({
          thumbjarDevice: 'ios',
          thumbjarPageUrl: 'http://localhost:8765/editor.html',
          thumbjarPageHint: 'Serve it.',
        }),
      }),
    ).rejects.toThrow(
      'iOS needs the optional `webdriverio` peer dependency and an Appium XCUITest server on port 4723, see the thumbjar README.',
    )
    expect(request.mock.calls[0]?.[0]).toEqual('http://127.0.0.1:4723/status')
  })

  test('fails within its bound when adb ignores SIGTERM', async () => {
    fakeAdb(
      `#!${process.execPath}\nprocess.on('SIGTERM', () => {}); setInterval(() => {}, 1000)`,
    )
    const start = Date.now()

    const settled = await setup().catch((error: Error) => error.message)

    expect({
      settled,
      inBound:
        Date.now() - start <
        (GLOBAL_SETUP_ADB_SECONDS + JOIN_GRACE_SECONDS) * 1000,
    }).toEqual({
      settled:
        'No Android device to type on (adb get-state timed out after 0.5s). Boot an API 36 Play Store emulator and run `thumbjar prepare`, see the thumbjar README.',
      inBound: true,
    })
  }, 10_000)

  test('fails within its bound when adb outlives SIGKILL', async () => {
    // The shell ignores SIGTERM and its background sleep keeps adb's output open after SIGKILL.
    const pids = join(directory, 'pids')
    fakeAdb(
      `#!/bin/sh\ntrap '' TERM\nsleep 60 &\necho "$$ $!" > ${JSON.stringify(pids)}\nwait`,
    )
    const start = Date.now()

    const settled = await setup().catch((error: Error) => error.message)
    const [shell, sleep] = readFileSync(pids, 'utf8')
      .trim()
      .split(' ')
      .map(Number)
    leftRunning.push(sleep!)

    expect({
      settled,
      inBound:
        Date.now() - start <
        (GLOBAL_SETUP_ADB_SECONDS + JOIN_GRACE_SECONDS) * 1000,
    }).toEqual({
      settled: `No Android device to type on (adb get-state (pid ${shell}) still runs after SIGKILL). Boot an API 36 Play Store emulator and run \`thumbjar prepare\`, see the thumbjar README.`,
      inBound: true,
    })
  }, 10_000)

  test('names a missing adb', async () => {
    vi.stubEnv('PATH', directory)

    await expect(setup()).rejects.toThrow(
      'No Android device to type on (adb is not on PATH). Boot an API 36 Play Store emulator and run `thumbjar prepare`, see the thumbjar README.',
    )
  })
})

function setup(): Promise<void> {
  return globalSetup({
    getProvidedContext: () => ({
      thumbjarPageUrl: 'http://localhost:8765/editor.html',
      thumbjarPageHint: 'Serve it.',
    }),
  })
}

function fakeAdb(script: string): void {
  writeFileSync(join(directory, 'adb'), script)
  chmodSync(join(directory, 'adb'), 0o755)
}
