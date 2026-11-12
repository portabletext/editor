import {spawnSync} from 'node:child_process'
import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {expect, test, vi} from 'vitest'
import {entry, execute} from './process.ts'

const workers = [
  'bin',
  'guard',
  'prepare/capture',
  'prepare/setup-ja',
  'prepare/dictionary',
  'run/cap',
  'run/check',
  'run/logcat',
]

test('resolves every default worker from the source package root', () => {
  expect(
    workers.map((name) => ({
      name,
      exists: existsSync(entry(name)),
      path: entry(name).endsWith(`/src/${name}.ts`),
    })),
  ).toEqual([
    {name: 'bin', exists: true, path: true},
    {name: 'guard', exists: true, path: true},
    {name: 'prepare/capture', exists: true, path: true},
    {name: 'prepare/setup-ja', exists: true, path: true},
    {name: 'prepare/dictionary', exists: true, path: true},
    {name: 'run/cap', exists: true, path: true},
    {name: 'run/check', exists: true, path: true},
    {name: 'run/logcat', exists: true, path: true},
  ])
})

test('resolves every default worker from the built package root', async () => {
  const directory = fileURLToPath(
    new URL('dist/', import.meta.resolve('thumbjar/package.json')),
  )
  const processChunk = readdirSync(directory).find(
    (name) =>
      name.startsWith('process-') &&
      name.endsWith('.js') &&
      readFileSync(directory + name, 'utf8').includes('function entry('),
  )
  if (!processChunk) {
    throw new Error('build thumbjar before running its unit tests')
  }
  const compiled = await import(pathToFileURL(directory + processChunk).href)
  const resolveEntry: typeof entry = Object.values(compiled).find(
    (value): value is typeof entry =>
      typeof value === 'function' && value.name === 'entry',
  )!
  expect(
    workers.map((name) => ({
      name,
      exists: existsSync(resolveEntry(name)),
      path: resolveEntry(name).endsWith(`/dist/${name}.js`),
    })),
  ).toEqual([
    {name: 'bin', exists: true, path: true},
    {name: 'guard', exists: true, path: true},
    {name: 'prepare/capture', exists: true, path: true},
    {name: 'prepare/setup-ja', exists: true, path: true},
    {name: 'prepare/dictionary', exists: true, path: true},
    {name: 'run/cap', exists: true, path: true},
    {name: 'run/check', exists: true, path: true},
    {name: 'run/logcat', exists: true, path: true},
  ])
})

test('ends the stage before execute resolves when only its guard is SIGKILLed', async () => {
  let stagePid: number | undefined
  let guardPid: number | undefined
  const running = execute('bash', ['-c', 'echo "$$ $PPID"; exec sleep 301.5'], {
    seconds: 3,
    killAfter: 2,
    stdout: (chunk) => {
      ;[stagePid, guardPid] = chunk.toString().trim().split(' ').map(Number)
    },
  })
  try {
    await vi.waitFor(() => expect(typeof guardPid).toEqual('number'))
    process.kill(guardPid!, 'SIGKILL')
    expect((await running).status).toEqual(137)
    expect(
      existsSync(`/proc/${stagePid}/stat`) &&
        !/^\d+ \(.*\) Z /.test(readFileSync(`/proc/${stagePid}/stat`, 'utf8')),
    ).toEqual(false)
  } finally {
    for (const pid of [stagePid, guardPid]) {
      if (pid !== undefined) {
        try {
          process.kill(pid, 'SIGKILL')
        } catch {}
      }
    }
    await running
  }
}, 10_000)

test('requires thumbjar to start a guard with IPC', () => {
  const result = spawnSync(process.execPath, [entry('guard')], {
    encoding: 'utf8',
  })
  expect({status: result.status, stderr: result.stderr}).toEqual({
    status: 2,
    stderr: 'thumbjar guard must be started by thumbjar\n',
  })
})
