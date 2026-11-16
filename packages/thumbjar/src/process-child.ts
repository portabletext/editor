import {spawn, type ChildProcess} from 'node:child_process'
import {constants} from 'node:os'

type Output = (chunk: Buffer) => void

export type ChildResult = {
  code: number | null
  status: number
  stdout: string
  stderr: string
  reason: unknown
  error: Error | undefined
  unstopped: boolean
  pid: number | undefined
}

export type ChildOptions = {
  seconds?: number
  killAfter: number
  killWait: number
  signal?: AbortSignal
  env?: NodeJS.ProcessEnv
  ipc?: boolean
  detached?: boolean
  groupPid?: number
  output?: 'pipe' | 'inherit' | number
  collect?: boolean
  stdout?: Output
  stderr?: Output
  timeoutReason?: () => unknown
  onSpawn?: (child: ChildProcess) => void
  reject?: (result: ChildResult) => unknown
  release?: boolean
}

export function runChildProcess(
  command: string,
  args: string[],
  options: ChildOptions,
): Promise<ChildResult> {
  options.signal?.throwIfAborted()
  return new Promise((resolve, reject) => {
    const output = options.output ?? 'pipe'
    const child = spawn(command, args, {
      detached: options.detached ?? false,
      ...(options.env === undefined ? {} : {env: options.env}),
      stdio: options.ipc
        ? ['ignore', output, output, 'ipc']
        : ['ignore', output, output],
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    child.stdout?.on('data', (chunk: Buffer) => {
      if (options.collect !== false) {
        stdout.push(chunk)
      }
      options.stdout?.(chunk)
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      if (options.collect !== false) {
        stderr.push(chunk)
      }
      options.stderr?.(chunk)
    })
    let reason: unknown
    let stopped = false
    let killed = false
    let finished = false
    let killAt = Infinity
    let killTimer: NodeJS.Timeout | undefined
    const timers: NodeJS.Timeout[] = []
    const finish = (
      code: number | null,
      signal: NodeJS.Signals | null,
      error?: Error,
      unstopped = false,
    ) => {
      if (finished) {
        return
      }
      finished = true
      for (const timer of timers) {
        clearTimeout(timer)
      }
      options.signal?.removeEventListener('abort', abort)
      if (options.release && unstopped) {
        child.stdout?.destroy()
        child.stderr?.destroy()
        child.unref()
      }
      const result = {
        code,
        status: killed
          ? 137
          : stopped
            ? 124
            : error
              ? 127
              : (code ??
                (signal === null ? 143 : 128 + constants.signals[signal])),
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
        reason,
        error,
        unstopped,
        pid: child.pid,
      }
      try {
        const failure = options.reject?.(result)
        if (failure !== undefined) {
          reject(failure)
        } else {
          resolve(result)
        }
      } catch (error) {
        reject(error)
      }
    }
    const send = (signal: NodeJS.Signals) => {
      if (options.groupPid !== undefined) {
        killGroup(options.groupPid, signal)
      } else {
        child.kill(signal)
      }
    }
    const stop = (cause: unknown) => {
      if (!stopped) {
        stopped = true
        reason = cause
        send('SIGTERM')
      }
      const nextKillAt = Date.now() + options.killAfter * 1000
      if (nextKillAt >= killAt) {
        return
      }
      killAt = nextKillAt
      if (killTimer) {
        clearTimeout(killTimer)
      }
      killTimer = setTimeout(
        () => {
          killed = true
          send('SIGKILL')
          timers.push(
            setTimeout(
              () => finish(null, 'SIGKILL', undefined, true),
              options.killWait * 1000,
            ),
          )
        },
        Math.max(0, killAt - Date.now()),
      )
      timers.push(killTimer)
    }
    const abort = () => stop(options.signal!.reason)
    if (options.seconds !== undefined) {
      timers.push(
        setTimeout(
          () => stop(options.timeoutReason?.()),
          options.seconds * 1000,
        ),
      )
    }
    options.signal?.addEventListener('abort', abort, {once: true})
    child.on('error', (error) => finish(null, null, error))
    child.on('close', (code, signal) => finish(code, signal))
    child.on('exit', (code, signal) => {
      if (options.release && signal === 'SIGKILL') {
        timers.push(
          setTimeout(
            () => finish(code, signal, undefined, true),
            options.killWait * 1000,
          ),
        )
      }
    })
    options.onSpawn?.(child)
  })
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
