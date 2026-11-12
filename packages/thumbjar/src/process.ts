import {spawn} from 'node:child_process'
import {mkdtempSync, openSync, closeSync, readFileSync, rmSync} from 'node:fs'
import {constants, tmpdir} from 'node:os'
import {join} from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
import {fileURLToPath} from 'node:url'

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
  const child = spawn(command, args, {
    detached: options.group !== false,
    stdio: ['ignore', descriptor ?? 'pipe', descriptor ?? 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  child.stdout?.on('data', (chunk: Buffer) => {
    if (options.collect !== false) {
      stdout += chunk.toString()
    }
    options.stdout?.(chunk)
  })
  child.stderr?.on('data', (chunk: Buffer) => {
    if (options.collect !== false) {
      stderr += chunk.toString()
    }
    options.stderr?.(chunk)
  })
  let timedOut = false
  let killed = false
  const grace = new AbortController()
  const deadline =
    options.seconds === undefined
      ? undefined
      : AbortSignal.timeout(options.seconds * 1000)
  const stop = () => {
    if (timedOut) {
      return
    }
    timedOut = true
    if (options.group === false) {
      child.kill('SIGTERM')
    } else {
      killGroup(child.pid, 'SIGTERM')
    }
    void delay(
      Math.min(
        options.killAfter,
        options.signal?.reason instanceof Deadline
          ? options.signal.reason.killAfter
          : options.killAfter,
      ) * 1000,
      undefined,
      {signal: grace.signal},
    )
      .then(() => {
        killed = true
        if (options.signal?.reason instanceof Deadline) {
          options.signal.reason.status = 137
        }
        options.group === false
          ? child.kill('SIGKILL')
          : killGroup(child.pid, 'SIGKILL')
      })
      .catch(() => {})
  }
  deadline?.addEventListener('abort', stop, {once: true})
  options.signal?.addEventListener('abort', stop, {once: true})
  const status = await new Promise<number>((resolve) => {
    child.once('error', (error) => {
      const message = `${error.message}\n`
      stderr += message
      options.stderr?.(Buffer.from(message))
      resolve(127)
    })
    child.once('close', (code, signal) =>
      resolve(
        killed
          ? 137
          : timedOut
            ? 124
            : (code ??
              (signal === null ? 143 : 128 + constants.signals[signal])),
      ),
    )
  })
  if (descriptor !== undefined) {
    closeSync(descriptor)
  }
  if (mergedFile !== undefined) {
    const output = readFileSync(mergedFile)
    stdout = output.toString()
    options.stdout?.(output)
    rmSync(merged!, {recursive: true, force: true})
  }
  if (timedOut) {
    options.group === false
      ? child.kill('SIGKILL')
      : killGroup(child.pid, 'SIGKILL')
  }
  grace.abort()
  deadline?.removeEventListener('abort', stop)
  options.signal?.removeEventListener('abort', stop)
  options.signal?.throwIfAborted()
  return {status, stdout, stderr}
}

export function killGroup(pid: number | undefined, signal: NodeJS.Signals) {
  if (pid === undefined) {
    return
  }
  try {
    process.kill(-pid, signal)
  } catch (error) {
    if (
      !(error instanceof Error && 'code' in error && error.code === 'ESRCH')
    ) {
      throw error
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
  status = 124
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
  try {
    return await task(AbortSignal.any([signal, controller.signal]))
  } finally {
    deadline.removeEventListener('abort', abort)
  }
}

export function entry(name: string) {
  return fileURLToPath(
    new URL(
      `${name}.${import.meta.url.endsWith('.ts') ? 'ts' : 'js'}`,
      import.meta.url,
    ),
  )
}
