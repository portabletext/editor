import type {TestContext} from 'vitest'
import {runOnDevice} from './driver.ts'
import {unsupportedReason} from './gboard/support.ts'
import {sessionChannels} from './session-channel.ts'
import type {
  ComposeStep,
  Json,
  RunOnDeviceOptions,
  Step,
  StepRecord,
} from './steps.ts'

export async function openOnDevice(
  context: TestContext,
  options: Omit<RunOnDeviceOptions, 'steps'>,
) {
  const cancellation = new AbortController()
  const owner = {
    ...context,
    signal: AbortSignal.any([context.signal, cancellation.signal]),
  }
  const steps: Step[] = []
  const waiting = new Map<
    number,
    {resolve: (record: StepRecord) => void; reject: (error: unknown) => void}
  >()
  let wake: (() => void) | undefined
  let closed = false
  let failed: {error: unknown} | undefined
  sessionChannels.set(steps, {
    async next(index) {
      while (index >= steps.length && !closed) {
        await new Promise<void>((resolve) => {
          wake = resolve
        })
      }
      return steps[index]
    },
    publish(index, record) {
      waiting.get(index)?.resolve(record)
      waiting.delete(index)
    },
  })
  const enqueue = (step: Step): Promise<StepRecord> => {
    if (failed) {
      return Promise.reject(failed.error)
    }
    if (closed) {
      return Promise.reject(new Error('Session is closed'))
    }
    const reason = unsupportedReason(step, options.keyboard)
    if (reason) {
      return Promise.reject(new Error(reason))
    }
    const result = new Promise<StepRecord>((resolve, reject) => {
      waiting.set(steps.length, {resolve, reject})
    })
    steps.push(step)
    wake?.()
    return result
  }
  const initial = enqueue({type: 'read'})
  const running = runOnDevice(owner, {...options, steps})
  void running.catch((error: unknown) => {
    failed = {error}
    closed = true
    for (const pending of waiting.values()) {
      pending.reject(error)
    }
    waiting.clear()
    wake?.()
  })
  context.onTestFinished(async () => {
    if (!closed) {
      cancellation.abort(new Error('Session was not closed'))
    }
    closed = true
    wake?.()
    await running.catch(() => {})
  })
  await initial
  return {
    type: (text: string, commit: ComposeStep['commit'] = 'none') =>
      enqueue({type: 'compose', text, commit}),
    enter: () => enqueue({type: 'enter'}),
    backspace: (times = 1) => enqueue({type: 'backspace', times}),
    page: (action: string, args: Json = null) =>
      enqueue({type: 'page', action, args}),
    read: () => enqueue({type: 'read'}),
    async close() {
      closed = true
      wake?.()
      return await running
    },
  }
}
