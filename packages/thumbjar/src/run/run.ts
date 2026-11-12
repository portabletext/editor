import {spawn} from 'node:child_process'
import {appendFileSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {dirname, join, resolve} from 'node:path'
import {
  COMMAND_READ_SECONDS,
  COMMAND_KILL_SECONDS,
  RUN_TEST_KILL_SECONDS,
  PREP_KILL_SECONDS,
  DIAGNOSTICS_SECONDS,
  RUN_SERVER_KILL_SECONDS,
} from '../device/budget.ts'
import {
  Deadline,
  entry,
  execute,
  killGroup,
  termination,
  within,
} from '../process.ts'

export async function run(
  options: {
    file: string
    keyboard: string
    pageDir: string
    config: string
    project: string
    port: string
    out: string
  },
  dependencies: {
    command?: string
    phase?: (
      message: string,
      write: () => void,
      signal: AbortSignal,
    ) => Promise<void>
  } = {},
): Promise<number> {
  const {file, keyboard, pageDir, config, project, port, out} = options
  mkdirSync(out, {recursive: true})
  const stop = termination()
  const serverStop = new AbortController()
  const command = dependencies.command ?? entry('bin')
  const timing = (line: string, print = false) => {
    const text = `${line}\n`
    appendFileSync(join(out, 'timing.txt'), text)
    if (print) {
      process.stdout.write(text)
    }
  }
  const log = async (message: string) => {
    stop.signal.throwIfAborted()
    const write = () => {
      const now = new Date()
      const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
        .map((value) => String(value).padStart(2, '0'))
        .join(':')
      const line = `PHASE ${time} ${message}\n`
      appendFileSync(join(out, 'phases.log'), line)
      process.stdout.write(line)
    }
    if (dependencies.phase) {
      await dependencies.phase(message, write, stop.signal)
    } else {
      write()
    }
  }
  const skipped = () => timing(`CHECKED skipped at ${epoch()}`)
  const deviceCheck = async () => {
    const checked = await execute(
      process.execPath,
      [entry('run/check'), join(out, 'timing.txt')],
      {
        seconds: COMMAND_READ_SECONDS,
        killAfter: COMMAND_KILL_SECONDS,
        signal: stop.signal,
        stderr: (chunk) => process.stderr.write(chunk),
      },
    )
    await log(
      `device check: ${checked.stdout.trimEnd()}${checked.status !== 0 ? `${checked.stdout ? '\n' : ''}unchecked` : ''}`,
    )
  }
  let server: Promise<unknown> | undefined
  let logcat: number | undefined
  try {
    const booted = epoch()
    timing(`BOOTED at ${booted}`, true)
    const cap = await execute(
      process.execPath,
      [entry('run/cap'), join(pageDir, '..', file)],
      {
        seconds: COMMAND_READ_SECONDS,
        killAfter: COMMAND_KILL_SECONDS,
        signal: stop.signal,
        stderr: (chunk) => process.stderr.write(chunk),
      },
    )
    const seconds = cap.stdout.trimEnd()
    if (!/^\d+$/.test(seconds)) {
      await log(`PREP FAILED: read the test stage timeout for ${file}`)
      skipped()
      return 1
    }
    await log('http server')
    const httpOutput = (chunk: Buffer) =>
      appendFileSync(join(out, 'http.log'), chunk)
    writeFileSync(join(out, 'http.log'), '')
    server = execute(
      process.execPath,
      [command, 'serve', pageDir, '--port', port],
      {
        killAfter: RUN_SERVER_KILL_SECONDS,
        signal: AbortSignal.any([stop.signal, serverStop.signal]),
        stdout: httpOutput,
        stderr: httpOutput,
      },
    ).catch(() => {})
    const earlier = read(join(out, 'phases.log')).length
    const prepared = await execute(
      process.execPath,
      [
        command,
        'prepare',
        '--keyboard',
        keyboard,
        '--page-url',
        `http://localhost:${port}/editor.html`,
        '--out-dir',
        out,
        '--booted',
        String(booted),
      ],
      {
        killAfter: PREP_KILL_SECONDS,
        signal: stop.signal,
        stdout: (chunk) => process.stdout.write(chunk),
        stderr: (chunk) => process.stderr.write(chunk),
      },
    )
    if (prepared.status !== 0) {
      const reason = read(join(out, 'phases.log'))
        .subarray(earlier)
        .toString()
        .split('\n')
        .map((line) => /PREP FAILED: .*/.exec(line)?.[0])
        .filter((line) => line !== undefined)
        .at(-1)
      if (reason) {
        timing(reason)
      }
      if (prepared.status === 3) {
        timing('PREP DICTIONARY_NOT_LOADED')
      }
      await deviceCheck()
      return 1
    }
    const capture = spawn(
      process.execPath,
      [
        entry('run/logcat'),
        String(
          Number(seconds) +
            RUN_TEST_KILL_SECONDS +
            COMMAND_READ_SECONDS +
            COMMAND_KILL_SECONDS +
            DIAGNOSTICS_SECONDS +
            COMMAND_KILL_SECONDS,
        ),
        join(out, 'logcat.txt'),
      ],
      {detached: true, stdio: 'ignore'},
    )
    logcat = capture.pid
    capture.unref()
    await log(`tests start, ${file} under ${seconds} seconds`)
    appendFileSync(join(out, 'vitest.log'), '')
    const testOutput = (chunk: Buffer) => {
      appendFileSync(join(out, 'vitest.log'), chunk)
      process.stdout.write(chunk)
    }
    const tests = await execute(
      process.execPath,
      [vitestBin(), 'run', '--config', config, '--project', project, file],
      {
        seconds: Number(seconds),
        killAfter: RUN_TEST_KILL_SECONDS,
        signal: stop.signal,
        stdout: testOutput,
        stderr: testOutput,
      },
    )
    await log(`tests rc=${tests.status}`)
    if (tests.status === 0) {
      skipped()
    } else {
      await deviceCheck()
    }
    try {
      await within(
        DIAGNOSTICS_SECONDS,
        COMMAND_KILL_SECONDS,
        stop.signal,
        async (signal) => {
          for (const [name, ...args] of [
            ['logcat-crash.txt', 'logcat', '-d', '-b', 'crash'],
            [
              'chrome-exit-info.txt',
              'shell',
              'dumpsys',
              'activity',
              'exit-info',
              'com.android.chrome',
            ],
            ['final.png', 'exec-out', 'screencap', '-p'],
          ]) {
            writeFileSync(join(out, name!), '')
            const result = await execute('adb', args, {
              seconds: DIAGNOSTICS_SECONDS,
              killAfter: COMMAND_KILL_SECONDS,
              signal,
              stdout: (chunk) => appendFileSync(join(out, name!), chunk),
              stderr: (chunk) => process.stderr.write(chunk),
            })
            if (name === 'final.png' && result.status !== 0) {
              await log(`diagnostics after the tests rc=${result.status}`)
            }
          }
        },
      )
    } catch (error) {
      stop.signal.throwIfAborted()
      if (!(error instanceof Deadline)) {
        throw error
      }
      await log(`diagnostics after the tests rc=${error.status}`)
    }
    timing(`DONE at ${epoch()}`, true)
    return tests.status
  } catch (error) {
    if (stop.signal.aborted) {
      return stop.status()
    }
    throw error
  } finally {
    if (stop.signal.aborted) {
      killGroup(logcat, 'SIGKILL')
    }
    serverStop.abort()
    await server
    stop.dispose()
  }
}

function epoch() {
  return Math.floor(Date.now() / 1000)
}

function read(file: string): Buffer {
  try {
    return readFileSync(file)
  } catch {
    return Buffer.alloc(0)
  }
}

function vitestBin() {
  const require = createRequire(join(process.cwd(), 'package.json'))
  const manifestPath = require.resolve('vitest/package.json')
  const manifest: {bin: string | Record<string, string>} = JSON.parse(
    readFileSync(manifestPath, 'utf8'),
  )
  const bin =
    typeof manifest.bin === 'string' ? manifest.bin : manifest.bin.vitest
  if (!bin) {
    throw new Error('vitest has no bin')
  }
  return resolve(dirname(manifestPath), bin)
}
