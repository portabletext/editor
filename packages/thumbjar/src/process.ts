import {mkdtempSync, openSync, closeSync, readFileSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {KILL_GRACE_SECONDS} from './device/budget.ts'
import {runChildProcess} from './process-child.ts'
export {killGroup} from './process-child.ts'

type Output = (chunk: Buffer) => void

export async function execute(
  command: string,
  args: string[],
  options: {
    seconds?: number
    group?: boolean
    collect?: boolean
    merge?: boolean
    killAfter: number
    signal?: AbortSignal
    stdout?: Output
    stderr?: Output
  },
): Promise<{status: number; stdout: string; stderr: string}> {
  options.signal?.throwIfAborted()
  const merged = options.merge
    ? mkdtempSync(join(tmpdir(), 'thumbjar-output-'))
    : undefined
  const mergedFile = merged === undefined ? undefined : join(merged, 'output')
  const descriptor =
    mergedFile === undefined ? undefined : openSync(mergedFile, 'w')
  let removeAbort = () => {}
  let guardedStatus: number | undefined
  try {
    const guarded = options.group !== false
    const result = await runChildProcess(
      guarded ? process.execPath : command,
      guarded
        ? [
            entry('guard'),
            JSON.stringify({
              command,
              args,
              seconds: options.seconds,
              killAfter: options.killAfter,
            }),
          ]
        : args,
      {
        ...(guarded
          ? {
              detached: true,
              ipc: true,
              onSpawn: (child) => {
                child.on('message', (message: {status: number}) => {
                  guardedStatus = message.status
                })
                const abort = () => {
                  if (child.connected) {
                    child.send(
                      {
                        killAfter:
                          options.signal?.reason instanceof Deadline
                            ? options.signal.reason.killAfter
                            : options.killAfter,
                      },
                      () => {},
                    )
                  }
                }
                options.signal?.addEventListener('abort', abort, {once: true})
                removeAbort = () =>
                  options.signal?.removeEventListener('abort', abort)
              },
            }
          : {
              ...(options.seconds === undefined
                ? {}
                : {seconds: options.seconds}),
              ...(options.signal === undefined ? {} : {signal: options.signal}),
            }),
        killAfter: options.killAfter,
        killWait: KILL_GRACE_SECONDS,
        output: descriptor ?? 'pipe',
        ...(options.collect === undefined ? {} : {collect: options.collect}),
        ...(options.stdout === undefined ? {} : {stdout: options.stdout}),
        ...(options.stderr === undefined ? {} : {stderr: options.stderr}),
        release: true,
      },
    )
    let stdout = result.stdout
    let stderr = result.stderr
    if (result.error) {
      const message = `${result.error.message}\n`
      stderr += message
      options.stderr?.(Buffer.from(message))
    }
    if (mergedFile !== undefined) {
      const output = readFileSync(mergedFile)
      stdout = output.toString()
      options.stdout?.(output)
    }
    options.signal?.throwIfAborted()
    return {status: guardedStatus ?? result.status, stdout, stderr}
  } finally {
    removeAbort()
    if (descriptor !== undefined) {
      closeSync(descriptor)
    }
    if (merged !== undefined) {
      rmSync(merged, {recursive: true, force: true})
    }
  }
}

export function termination() {
  const controller = new AbortController()
  let status = 0
  const handlers = (['SIGTERM', 'SIGINT', 'SIGHUP'] as const).map((signal) => {
    const handler = () => {
      status = signal === 'SIGINT' ? 130 : signal === 'SIGHUP' ? 129 : 143
      controller.abort(new Error(signal))
    }
    process.on(signal, handler)
    return {signal, handler}
  })
  return {
    signal: controller.signal,
    status: () => status,
    dispose: () => {
      for (const {signal, handler} of handlers) {
        process.off(signal, handler)
      }
    },
  }
}

export class Deadline extends Error {
  readonly status = 124
  readonly seconds: number
  readonly killAfter: number
  constructor(seconds: number, killAfter: number) {
    super(`deadline after ${seconds}s`)
    this.seconds = seconds
    this.killAfter = killAfter
  }
}

export async function within<Result>(
  seconds: number,
  killAfter: number,
  signal: AbortSignal,
  task: (signal: AbortSignal) => Promise<Result>,
): Promise<Result> {
  const controller = new AbortController()
  const deadline = AbortSignal.timeout(seconds * 1000)
  const abort = () => controller.abort(new Deadline(seconds, killAfter))
  deadline.addEventListener('abort', abort, {once: true})
  const combined = AbortSignal.any([signal, controller.signal])
  try {
    return await task(combined)
  } catch (error) {
    combined.throwIfAborted()
    throw error
  } finally {
    deadline.removeEventListener('abort', abort)
  }
}

export function entry(name: string) {
  const source = import.meta.url.endsWith('.ts')
  return fileURLToPath(
    new URL(
      `${source ? 'src' : 'dist'}/${name}.${source ? 'ts' : 'js'}`,
      import.meta.resolve('thumbjar/package.json'),
    ),
  )
}
