import {spawn, spawnSync} from 'node:child_process'
import {
  existsSync,
  readdirSync,
  readFileSync,
  mkdtempSync,
  writeFileSync,
  watch,
  rmSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
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

test('requires thumbjar to start a guard with IPC', async () => {
  const send = process.send
  let status = 0
  let stderr = ''
  const exited = new Error('process exited')
  try {
    delete process.send
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      stderr += chunk.toString()
      return true
    })
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      status = Number(code)
      throw exited
    })
    vi.resetModules()
    try {
      await import('./guard.ts')
    } catch (error) {
      if (error !== exited) {
        throw error
      }
    }
  } finally {
    if (send !== undefined) {
      process.send = send
    }
    vi.restoreAllMocks()
  }
  expect({status, stderr}).toEqual({
    status: 2,
    stderr: 'thumbjar guard must be started by thumbjar\n',
  })
})

test('forwards process-only SIGTERM through the guard and leaves no stage writer', async () => {
  expect(await stopGuardedStage('SIGTERM', false)).toEqual({
    status: 143,
    ready: ['stage', 'descendant'],
    alive: [],
    terminated: ['descendant', 'stage'],
  })
})

test('forwards process-only SIGINT through the guard and leaves no stage writer', async () => {
  expect(await stopGuardedStage('SIGINT', false)).toEqual({
    status: 130,
    ready: ['stage', 'descendant'],
    alive: [],
    terminated: ['descendant', 'stage'],
  })
})

test('ends the stage and descendants when the run group receives SIGTERM', async () => {
  expect(await stopGuardedStage('SIGTERM', true)).toEqual({
    status: 143,
    ready: ['stage', 'descendant'],
    alive: [],
    terminated: ['descendant', 'stage'],
  })
})

test('ends the stage and descendants when the run group receives SIGKILL', async () => {
  expect(await stopGuardedStage('SIGKILL', true)).toEqual({
    status: null,
    ready: ['stage', 'descendant'],
    alive: [],
    terminated: ['descendant', 'stage'],
  })
})

test('leaves no recorded writer after the guard shuts down on disconnect', async () => {
  expect(await stopGuardedStage('disconnect', false)).toEqual({
    status: null,
    ready: ['stage', 'descendant'],
    alive: [],
    terminated: ['descendant', 'stage'],
  })
})

async function stopGuardedStage(
  signal: 'SIGTERM' | 'SIGINT' | 'SIGKILL' | 'disconnect',
  group: boolean,
) {
  const directory = mkdtempSync(join(tmpdir(), 'thumbjar-guard-contract-'))
  const records = join(directory, 'writers')
  const stage = join(directory, 'stage.sh')
  const runner = join(directory, 'runner.mjs')
  writeFileSync(
    stage,
    `#!/bin/bash
trap 'echo stage >> "${directory}/terminated"; wait; exit 0' TERM INT
printf 'stage %s %s\\n' "$$" "$PPID" >> '${records}'
bash -c 'trap "echo descendant >> ${directory}/terminated; exit 0" TERM INT; printf "descendant %s\\n" "$$" >> "${records}"; read -r line < "${directory}/hold"' &
wait
`,
  )
  const fifo = spawnSync('mkfifo', [join(directory, 'hold')])
  expect(fifo.status).toEqual(0)
  writeFileSync(
    runner,
    `import {execute, termination} from ${JSON.stringify(new URL('process.ts', import.meta.url).href)}
const stop=termination()
try {await execute('/bin/bash',[${JSON.stringify(stage)}],{killAfter:0.5,signal:stop.signal})}catch{}finally{stop.dispose()}
process.exitCode=stop.status()
`,
  )
  const child =
    signal === 'disconnect'
      ? spawn(
          process.execPath,
          [
            entry('guard'),
            JSON.stringify({
              command: '/bin/bash',
              args: [stage],
              killAfter: 0.5,
            }),
          ],
          {detached: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc']},
        )
      : spawn(process.execPath, [runner], {detached: true, stdio: 'ignore'})
  writeFileSync(join(directory, 'runner-pid'), String(child.pid))
  const exited = new Promise<number | null>((resolve) =>
    child.once('exit', resolve),
  )
  let pids: number[] = []
  const ready = Promise.withResolvers<void>()
  const recordWriters = () => {
    if (!existsSync(records)) {
      return
    }
    const lines = readFileSync(records, 'utf8')
      .trim()
      .split('\n')
      .map((line) => line.split(' '))
    if (lines.length === 2) {
      pids = lines.flatMap((line) => line.slice(1).map(Number))
      ready.resolve()
    }
  }
  const watcher = watch(directory, recordWriters)
  try {
    recordWriters()
    await ready.promise
    expect(
      readFileSync(records, 'utf8')
        .trim()
        .split('\n')
        .map((line) => line.split(' ')[0]),
    ).toEqual(['stage', 'descendant'])
    if (signal === 'disconnect') {
      child.disconnect()
    } else {
      process.kill(group ? -child.pid! : child.pid!, signal)
    }
    const status = await exited
    await vi.waitFor(() => expect(pids.filter(writerAlive)).toEqual([]))
    return {
      status,
      ready: readFileSync(records, 'utf8')
        .trim()
        .split('\n')
        .map((line) => line.split(' ')[0]),
      alive: pids.filter(writerAlive),
      terminated: readFileSync(join(directory, 'terminated'), 'utf8')
        .trim()
        .split('\n')
        .sort(),
    }
  } finally {
    watcher.close()
    if (existsSync(records)) {
      pids = readFileSync(records, 'utf8')
        .trim()
        .split('\n')
        .flatMap((line) => line.split(' ').slice(1).map(Number))
    }
    for (const pid of [child.pid, ...pids]) {
      if (pid !== undefined && writerAlive(pid)) {
        try {
          process.kill(pid, 'SIGKILL')
        } catch {}
      }
    }
    await exited
    rmSync(directory, {recursive: true, force: true})
  }
}

function writerAlive(pid: number) {
  try {
    return !/^\d+ \(.*\) Z /.test(readFileSync(`/proc/${pid}/stat`, 'utf8'))
  } catch {
    return false
  }
}
