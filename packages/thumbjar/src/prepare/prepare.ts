import {spawn, type ChildProcess} from 'node:child_process'
import {
  appendFileSync,
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import {join} from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
import {
  CAPTURE_SEED_SECONDS,
  KILL_GRACE_SECONDS,
  PREP_KILL_SECONDS,
  prepDeadlineSeconds,
  SELF_UPDATE_BLOCK_SECONDS,
  DICTIONARY_LOAD_SECONDS,
  DICTIONARY_WAIT_KILL_SECONDS,
  DICTIONARY_WAIT_TAIL_SECONDS,
  DICTIONARY_CHECK_KILL_SECONDS,
  DICTIONARY_CHECK_SECONDS,
  PREP_ADB_SECONDS,
  COMMAND_KILL_SECONDS,
  PLAY_STORE_COMMAND_SECONDS,
  PLAY_STORE_COMMAND_KILL_SECONDS,
  SETTLE_SECONDS,
  SETTLE_EVENT_SECONDS,
  SETTLE_CLEAR_SECONDS,
  SETTLE_POLL_SECONDS,
  SETTLE_QUIET_SECONDS,
  JAPANESE_SETUP_SECONDS,
  JAPANESE_SETUP_KILL_SECONDS,
  DIAGNOSTICS_SECONDS,
  CAPTURE_KILL_WAIT_SECONDS,
} from '../device/budget.ts'
import {
  Deadline,
  entry,
  execute,
  killGroup,
  termination,
  within,
} from '../process.ts'
import {diagnose} from './diagnose.ts'
import {httpReady} from './http.ts'

export const prepDeadlines = {
  prep: {
    ja: prepDeadlineSeconds('ja'),
    en: prepDeadlineSeconds('en'),
    killAfter: PREP_KILL_SECONDS,
  },
  bootCapture: {seconds: CAPTURE_SEED_SECONDS, killAfter: KILL_GRACE_SECONDS},
  selfUpdateBlock: {
    seconds: SELF_UPDATE_BLOCK_SECONDS,
    killAfter: KILL_GRACE_SECONDS,
  },
  dictionaryLoad: DICTIONARY_LOAD_SECONDS,
  dictionaryWait: {
    seconds: DICTIONARY_WAIT_TAIL_SECONDS,
    killAfter: DICTIONARY_WAIT_KILL_SECONDS,
  },
  dictionaryCheck: {
    seconds: DICTIONARY_CHECK_SECONDS,
    killAfter: DICTIONARY_CHECK_KILL_SECONDS,
  },
  adb: {seconds: PREP_ADB_SECONDS, killAfter: COMMAND_KILL_SECONDS},
  playStoreCommand: {
    seconds: PLAY_STORE_COMMAND_SECONDS,
    killAfter: PLAY_STORE_COMMAND_KILL_SECONDS,
  },
  settle: {
    seconds: SETTLE_SECONDS,
    quiet: SETTLE_QUIET_SECONDS,
    poll: SETTLE_POLL_SECONDS,
  },
  settleEvents: {
    seconds: SETTLE_EVENT_SECONDS,
    killAfter: COMMAND_KILL_SECONDS,
  },
  settleClear: {seconds: SETTLE_CLEAR_SECONDS, killAfter: COMMAND_KILL_SECONDS},
  diagnose: {seconds: DIAGNOSTICS_SECONDS, killAfter: COMMAND_KILL_SECONDS},
  setup: {
    seconds: JAPANESE_SETUP_SECONDS,
    killAfter: JAPANESE_SETUP_KILL_SECONDS,
  },
  captureStop: {term: KILL_GRACE_SECONDS, kill: CAPTURE_KILL_WAIT_SECONDS},
}

export async function prepare(
  options: {
    keyboard: string
    out: string
    pageUrl: string
    port: string
    booted: number
  },
  dependencies: {
    node?: string
    setup?: string
    dictionary?: string
    sleep?: (seconds: number, signal: AbortSignal) => Promise<void>
    request?: (url: string, signal: AbortSignal) => Promise<boolean>
    deadline?: number
  } = {},
): Promise<number> {
  const {keyboard, out, pageUrl, port, booted} = options
  mkdirSync(out, {recursive: true})
  const stop = termination()
  const sleep =
    dependencies.sleep ??
    (async (seconds, signal) => {
      await delay(seconds * 1000, undefined, {signal})
    })
  const log = (message: string) => {
    const now = new Date()
    const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map((value) => String(value).padStart(2, '0'))
      .join(':')
    const line = `PHASE ${time} ${message}\n`
    appendFileSync(join(out, 'phases.log'), line)
    process.stdout.write(line)
  }
  const fail = (message: string): never => {
    log(`PREP FAILED: ${message}`)
    throw new PrepFailure(1)
  }
  const adb = async (args: string[], signal: AbortSignal, capture = false) => {
    const result = await execute('adb', args, {
      ...prepDeadlines.adb,
      signal,
      ...(capture
        ? {}
        : {stdout: (chunk: Buffer) => process.stdout.write(chunk)}),
      stderr: (chunk) => process.stderr.write(chunk),
    })
    if (result.status === 124) {
      log(`TIMEOUT adb ${args.join(' ')}`)
    }
    return result
  }
  const node = (
    file: string,
    args: string[],
    seconds: number,
    killAfter: number,
    name: string,
    signal: AbortSignal,
  ) => {
    appendFileSync(join(out, name), '')
    const output = (chunk: Buffer) => {
      appendFileSync(join(out, name), chunk)
      process.stdout.write(chunk)
    }
    return execute(dependencies.node ?? process.execPath, [file, ...args], {
      seconds,
      killAfter,
      signal,
      stdout: output,
      stderr: output,
    })
  }
  let reader: ChildProcess | undefined
  let stopping: Promise<void> | undefined
  const stopCapture = () =>
    (stopping ??= (async () => {
      if (reader?.pid === undefined) {
        return
      }
      killGroup(reader.pid, 'SIGTERM')
      await waitForExit(reader, prepDeadlines.captureStop.term * 1000)
      killGroup(reader.pid, 'SIGKILL')
      await waitForExit(reader, prepDeadlines.captureStop.kill * 1000)
    })())
  const captureAbort = () => {
    void stopCapture()
  }
  stop.signal.addEventListener('abort', captureAbort, {once: true})
  try {
    if (keyboard === 'ja') {
      log('boot capture')
      try {
        await within(
          prepDeadlines.bootCapture.seconds,
          prepDeadlines.bootCapture.killAfter,
          stop.signal,
          async (signal) => {
            const bootId = (
              await adb(
                ['shell', 'cat', '/proc/sys/kernel/random/boot_id'],
                signal,
                true,
              )
            ).stdout
              .replaceAll('\r', '')
              .trimEnd()
            const values = (
              await adb(
                ['shell', 'echo $(date +%s) $(cat /proc/uptime)'],
                signal,
                true,
              )
            ).stdout
              .trim()
              .split(/\s+/)
              .map(Number)
            const btime =
              values.length >= 2
                ? Math.trunc(values[0]! - values[1]!)
                : undefined
            if (!bootId || btime === undefined || !Number.isFinite(btime)) {
              fail('boot capture')
            }
            const file = join(out, 'boot-logcat.txt')
            writeFileSync(file, `CAPTURE boot_id=${bootId} btime=${btime}\n`)
            if (
              (await adb(['logcat', '-G', '16M', '-b', 'main'], signal))
                .status !== 0
            ) {
              log('logcat -G failed')
            }
            appendFileSync(file, 'CAPTURE_SEGMENT seed\n')
            const output = (chunk: Buffer) => appendFileSync(file, chunk)
            const seed = await execute(
              'adb',
              ['logcat', '-d', '-v', 'epoch', '-b', 'main'],
              {...prepDeadlines.adb, signal, stdout: output, stderr: output},
            )
            if (seed.status !== 0) {
              fail('boot capture')
            }
            const stats = (
              await adb(['logcat', '-S', '-b', 'main'], signal, true)
            ).stdout
            const total = /^Total\s+(\S+)/m.exec(stats)?.[1]
            const now = /^Now\s+(\S+)/m.exec(stats)?.[1]
            if (total && now) {
              appendFileSync(
                file,
                `CAPTURE_STATS main total=${total} now=${now}\n`,
              )
            }
          },
        )
      } catch (error) {
        if (stop.signal.aborted) {
          throw error
        }
        fail('boot capture ran past 15s or failed')
      }
      const descriptor = openSync(join(out, 'boot-logcat.txt'), 'a')
      try {
        reader = spawn(process.execPath, [entry('prepare/capture')], {
          detached: true,
          stdio: ['ignore', descriptor, descriptor],
        })
      } finally {
        closeSync(descriptor)
      }
    }
    const deadline =
      dependencies.deadline ??
      prepDeadlines.prep[keyboard === 'ja' ? 'ja' : 'en']
    await within(
      deadline,
      prepDeadlines.prep.killAfter,
      stop.signal,
      async (signal) => {
        signal.addEventListener('abort', captureAbort, {once: true})
        if (
          (
            await adb(
              ['shell', 'settings', 'put', 'global', 'hide_error_dialogs', '1'],
              signal,
            )
          ).status !== 0
        ) {
          fail('hide error dialogs')
        }
        try {
          await within(
            prepDeadlines.selfUpdateBlock.seconds,
            prepDeadlines.selfUpdateBlock.killAfter,
            signal,
            async (blockSignal) => {
              const disabled = await execute(
                'adb',
                [
                  'shell',
                  'pm',
                  'disable-user',
                  '--user',
                  '0',
                  'com.android.vending',
                ],
                {
                  ...prepDeadlines.playStoreCommand,
                  signal: blockSignal,
                  merge: true,
                },
              )
              const output = disabled.stdout
                .replace(/\n+$/, '')
                .replaceAll('\r', '')
                .replaceAll('\n', ' ')
                .replace(/ $/, '')
              const disable =
                disabled.status === 0
                  ? 'succeeded'
                  : [124, 137].includes(disabled.status)
                    ? 'failed (no answer within 8s)'
                    : `failed (exit ${disabled.status}: ${output})`
              const listed = await execute(
                'adb',
                [
                  'shell',
                  'pm',
                  'list',
                  'packages',
                  '-d',
                  'com.android.vending',
                ],
                {...prepDeadlines.playStoreCommand, signal: blockSignal},
              )
              log(
                `self-update block: disabling com.android.vending ${disable}, pm list packages -d ${listed.stdout.replaceAll('\r', '').split('\n').includes('package:com.android.vending') ? 'lists' : 'does not list'} it`,
              )
            },
          )
        } catch (error) {
          signal.throwIfAborted()
          if (!(error instanceof Deadline)) {
            throw error
          }
          log('self-update block: ran past 20s')
        }
        log('settle start')
        let quiet = 0
        const start = Date.now()
        while (Date.now() - start < prepDeadlines.settle.seconds * 1000) {
          const events = await execute(
            'adb',
            ['logcat', '-d', '-b', 'events'],
            {...prepDeadlines.settleEvents, signal},
          )
          if (events.stdout.includes('am_anr')) {
            quiet = 0
            await execute('adb', ['logcat', '-b', 'events', '-c'], {
              ...prepDeadlines.settleClear,
              signal,
              stdout: (chunk) => process.stdout.write(chunk),
              stderr: (chunk) => process.stderr.write(chunk),
            })
          } else {
            quiet += prepDeadlines.settle.poll
          }
          if (quiet >= prepDeadlines.settle.quiet) {
            break
          }
          await sleep(prepDeadlines.settle.poll, signal)
        }
        log(
          `settle done after ${Math.floor((Date.now() - start) / 1000)}s quiet=${quiet}`,
        )
        log('diagnose start')
        try {
          await within(
            prepDeadlines.diagnose.seconds,
            prepDeadlines.diagnose.killAfter,
            signal,
            (diagnoseSignal) => diagnose(out, diagnoseSignal),
          )
        } catch (error) {
          signal.throwIfAborted()
          if (!(error instanceof Deadline)) {
            throw error
          }
          log(`diagnose rc=${error.status}`)
        }
        log('chrome flags')
        if (
          (
            await adb(
              [
                'shell',
                'am',
                'set-debug-app',
                '--persistent',
                'com.android.chrome',
              ],
              signal,
            )
          ).status !== 0
        ) {
          fail('chrome debug app')
        }
        if (
          (
            await adb(
              [
                'shell',
                'echo "_ --disable-fre --no-default-browser-check --no-first-run --disable-features=SigninPromo" > /data/local/tmp/chrome-command-line',
              ],
              signal,
            )
          ).status !== 0
        ) {
          fail('chrome command line')
        }
        await adb(
          ['shell', 'cat', '/data/local/tmp/chrome-command-line'],
          signal,
        )
        log('soft keyboard')
        if (
          (
            await adb(
              [
                'shell',
                'settings',
                'put',
                'secure',
                'show_ime_with_hard_keyboard',
                '1',
              ],
              signal,
            )
          ).status !== 0
        ) {
          fail('soft keyboard')
        }
        await adb(
          ['shell', 'settings', 'get', 'secure', 'show_ime_with_hard_keyboard'],
          signal,
        )
        if (keyboard === 'ja') {
          log('japanese setup')
          const setup = await node(
            dependencies.setup ?? entry('prepare/setup-ja'),
            [out],
            prepDeadlines.setup.seconds,
            prepDeadlines.setup.killAfter,
            'ja-setup.log',
            signal,
          )
          log(`japanese setup rc=${setup.status}`)
          if (setup.status !== 0) {
            fail('japanese setup, see ja-setup.log')
          }
          const waitSeconds = Math.max(
            0,
            booted +
              prepDeadlines.dictionaryLoad -
              Math.floor(Date.now() / 1000),
          )
          log('japanese dictionary wait')
          const earlier = read(join(out, 'ja-dictionary.log')).length
          const wait = await node(
            dependencies.dictionary ?? entry('prepare/dictionary'),
            ['wait', out, String(booted)],
            waitSeconds + prepDeadlines.dictionaryWait.seconds,
            prepDeadlines.dictionaryWait.killAfter,
            'ja-dictionary.log',
            signal,
          )
          log(`japanese dictionary wait rc=${wait.status}`)
          if (wait.status !== 0) {
            const reason = read(join(out, 'ja-dictionary.log'))
              .subarray(earlier)
              .toString()
              .split('\n')
              .find((line) => line.startsWith('DICTIONARY FAILED: '))
            if (!reason) {
              return fail(
                'japanese dictionary wait gave no reason, see ja-dictionary.log',
              )
            }
            log(
              `PREP FAILED: ${reason.slice('DICTIONARY FAILED: '.length)} See ja-dictionary.log for the dictionary lines it saw.`,
            )
            throw new PrepFailure(wait.status === 3 ? 3 : 1)
          }
          log('japanese dictionary check')
          const check = await node(
            dependencies.dictionary ?? entry('prepare/dictionary'),
            ['check', out, pageUrl],
            prepDeadlines.dictionaryCheck.seconds,
            prepDeadlines.dictionaryCheck.killAfter,
            'ja-dictionary.log',
            signal,
          )
          log(`japanese dictionary check rc=${check.status}`)
          if (check.status !== 0) {
            fail('japanese dictionary check, see ja-dictionary.log')
          }
          await stopCapture()
        }
        log('logcat')
        await adb(['logcat', '-c'], signal)
        if (!(await (dependencies.request ?? httpReady)(pageUrl, signal))) {
          fail('http server, see http.log')
        }
        log('http ok')
        if (port) {
          if (
            (await adb(['reverse', `tcp:${port}`, `tcp:${port}`], signal))
              .status !== 0
          ) {
            fail('adb reverse')
          }
          const listed = await adb(['reverse', '--list'], signal)
          if (listed.status !== 0) {
            log(`adb reverse --list rc=${listed.status}`)
          }
        }
      },
    )
    return 0
  } catch (error) {
    if (stop.signal.aborted) {
      return stop.status()
    }
    if (error instanceof PrepFailure) {
      return error.status
    }
    if (error instanceof Deadline) {
      if (error.status === 124) {
        log(`PREP FAILED: prep ran past ${error.seconds}s`)
      }
      return 1
    }
    throw error
  } finally {
    await stopCapture()
    stop.dispose()
  }
}

function read(file: string): Buffer {
  try {
    return readFileSync(file)
  } catch {
    return Buffer.alloc(0)
  }
}

class PrepFailure extends Error {
  readonly status: number
  constructor(status: number) {
    super(`prep status ${status}`)
    this.status = status
  }
}

async function waitForExit(child: ChildProcess, milliseconds: number) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return
  }
  const timer = new AbortController()
  let closed: (() => void) | undefined
  try {
    await Promise.race([
      new Promise<void>((resolve) => {
        closed = () => resolve()
        child.once('close', closed)
      }),
      delay(milliseconds, undefined, {signal: timer.signal}),
    ])
  } finally {
    timer.abort()
    if (closed) {
      child.off('close', closed)
    }
  }
}
