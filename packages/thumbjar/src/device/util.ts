// Small helpers shared by the driver scripts. PHASE lines print values in Python's repr() and sorted()
// notation, so they read the same as the logs of the recorded CI runs the fixtures come from.

import {AsyncLocalStorage} from 'node:async_hooks'
import {JOIN_GRACE_SECONDS} from './budget.ts'

let phaseClockStart = Date.now()

// The signal of the attempt the current call belongs to.
const attemptSignal = new AsyncLocalStorage<AbortSignal>()

/** Run `run` so every later `sleep`, `tracked` and transport call in it stops once `signal` aborts. */
export function runAbortable<T>(
  signal: AbortSignal,
  run: () => Promise<T>,
): Promise<T> {
  return attemptSignal.run(signal, run)
}

/** The signal of the attempt the current call belongs to, if any. */
export function currentSignal(): AbortSignal | undefined {
  return attemptSignal.getStore()
}

/** Throw the attempt's abort reason once it aborted. Call it after every await that precedes a device side effect. */
export function throwIfAborted(): void {
  attemptSignal.getStore()?.throwIfAborted()
}

/** Wait `seconds`, rejecting at once with the abort reason when the attempt aborts. */
export async function sleep(seconds: number): Promise<void> {
  const signal = attemptSignal.getStore()
  signal?.throwIfAborted()
  await new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal!.reason)
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, seconds * 1000)
    signal?.addEventListener('abort', onAbort, {once: true})
  })
}

/** Reject with the signal's reason when it aborts, and never settle otherwise. */
export function whenAborted(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal.aborted) {
      reject(signal.reason)
    } else {
      signal.addEventListener('abort', () => reject(signal.reason), {
        once: true,
      })
    }
  })
}

/**
 * Run `run` under its own abort signal, which aborts after `seconds` or when the enclosing signal aborts.
 * `run` sees the abort through `sleep`, `tracked` and the transport. Once aborted, wait up to
 * `JOIN_GRACE_SECONDS` for `run` to stop, then reject with the abort reason, so the call settles within
 * `seconds + JOIN_GRACE_SECONDS` even when `run` ignores the abort.
 */
export async function withDeadline<T>(
  label: string,
  seconds: number,
  run: () => Promise<T>,
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(
    () =>
      controller.abort(
        new DeadlineError(`${label} timed out after ${seconds}s`),
      ),
    seconds * 1000,
  )
  const parent = attemptSignal.getStore()
  const onParentAbort = () => controller.abort(parent!.reason)
  if (parent?.aborted) {
    controller.abort(parent.reason)
  } else {
    parent?.addEventListener('abort', onParentAbort, {once: true})
  }
  try {
    controller.signal.throwIfAborted()
  } catch (error) {
    clearTimeout(timer)
    throw error
  }
  const work = runAbortable(controller.signal, run)
  try {
    return await Promise.race([work, whenAborted(controller.signal)])
  } catch (error) {
    if (controller.signal.aborted) {
      await Promise.race([
        work.catch(() => {}),
        unboundedDelay(JOIN_GRACE_SECONDS),
      ])
    }
    throw error
  } finally {
    clearTimeout(timer)
    parent?.removeEventListener('abort', onParentAbort)
  }
}

export class DeadlineError extends Error {
  override name = 'DeadlineError'
}

/** Count PHASE times from now, so each attempt's lines start near zero. */
export function resetPhaseClock(): void {
  phaseClockStart = Date.now()
}

export function phase(message: string): void {
  const elapsed = ((Date.now() - phaseClockStart) / 1000).toFixed(1).padStart(5)
  // oxlint-disable-next-line no-console -- PHASE lines are progress output, not warnings, and the rule only allows `console.warn` and `console.error`
  console.log(`PHASE +${elapsed}s ${message}`)
}

// The call the driver is blocked on, so the watchdog can say where a hang sits.
let inFlight = ''

export async function tracked<T>(
  label: string,
  run: () => Promise<T>,
): Promise<T> {
  throwIfAborted()
  const previous = inFlight
  inFlight = label
  try {
    return await run()
  } finally {
    inFlight = previous
  }
}

/** Log what the driver is waiting on shortly before its attempt times out. Returns a function that cancels it. */
export function watchdog(seconds: number): () => void {
  const timer = setTimeout(
    () =>
      phase(
        `WATCHDOG still running after ${seconds}s, waiting on: ${inFlight || 'nothing tracked'}`,
      ),
    seconds * 1000,
  )
  timer.unref()
  return () => clearTimeout(timer)
}

/** Python's sorted() order for strings: by code point, not by UTF-16 unit. */
export function pySorted(values: Iterable<string>): string[] {
  return [...values].sort((left, right) => {
    const leftCharacters = [...left]
    const rightCharacters = [...right]
    for (
      let index = 0;
      index < Math.min(leftCharacters.length, rightCharacters.length);
      index++
    ) {
      const difference =
        leftCharacters[index]!.codePointAt(0)! -
        rightCharacters[index]!.codePointAt(0)!
      if (difference !== 0) {
        return difference
      }
    }
    return leftCharacters.length - rightCharacters.length
  })
}

/** Python's len() for a string, in code points. */
export function pyLen(value: string): number {
  return [...value].length
}

/** Python's repr() for the JSON-like values the driver logs. */
export function pyRepr(value: unknown): string {
  if (value === null || value === undefined) {
    return 'None'
  }
  if (typeof value === 'string') {
    return reprString(value)
  }
  if (typeof value === 'boolean') {
    return value ? 'True' : 'False'
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(pyRepr).join(', ')}]`
  }
  if (typeof value === 'object') {
    return `{${Object.entries(value)
      .map(([key, entry]) => `${reprString(key)}: ${pyRepr(entry)}`)
      .join(', ')}}`
  }
  return String(value)
}

/** Python's str(): strings as they are, everything else as repr(). */
export function pyStr(value: unknown): string {
  return typeof value === 'string' ? value : pyRepr(value)
}

export function errorRepr(error: unknown): string {
  if (error instanceof Error) {
    const cause =
      error.cause instanceof Error
        ? ` (${error.cause.name}: ${error.cause.message})`
        : ''
    return `${error.name}: ${error.message}${cause}`
  }
  return String(error)
}

/** Shown in place of a thrown value that cannot be converted to text. */
export const UNPRINTABLE_ERROR =
  '<thrown value that cannot be converted to text>'

/**
 * `errorRepr`, or `UNPRINTABLE_ERROR` when converting `error` throws, for example from its `toString` or a
 * `message` getter, so describing a failure never replaces it. Every part goes through `String`, which
 * shows a Symbol by its description where a template literal would throw.
 */
export function guardedErrorRepr(error: unknown): string {
  try {
    if (error instanceof Error) {
      const cause =
        error.cause instanceof Error
          ? ` (${String(error.cause.name)}: ${String(error.cause.message)})`
          : ''
      return `${String(error.name)}: ${String(error.message)}${cause}`
    }
    return String(error)
  } catch {
    return UNPRINTABLE_ERROR
  }
}

/**
 * `error`'s message, or `error` as a string when it is not an `Error`, or `UNPRINTABLE_ERROR` when reading
 * or converting either throws. `String` shows a Symbol by its description.
 */
export function guardedErrorMessage(error: unknown): string {
  try {
    return String(error instanceof Error ? error.message : error)
  } catch {
    return UNPRINTABLE_ERROR
  }
}

/**
 * How the driver reads a value it did not create, a thrown value or an abort reason, which can be any
 * value: a revoked Proxy throws from `instanceof`, and a throwing `toString` or a Symbol `message` from
 * a conversion.
 */
export type Inspection = {
  /** `error` as text, for a log line or a step record. */
  describe: (error: unknown) => string
  /** `error.message`, for the `driverRuns` record of a page exception. */
  message: (error: Error) => string
  /** What `inspect` returns, or `fallback` when the inspection is guarded and `inspect` throws. */
  guard: <T>(inspect: () => T, fallback: T) => T
}

/** Lets every conversion throw as it did, so the errors and log lines of `typeOnDevice` stay as they were. */
export const PLAIN_INSPECTION: Inspection = {
  describe: errorRepr,
  message: (error) => error.message,
  guard: (inspect) => inspect(),
}

/** Never throws in place of the value it reads, so `runOnDevice` keeps the thrown value and the abort reason. */
export const GUARDED_INSPECTION: Inspection = {
  describe: guardedErrorRepr,
  message: guardedErrorMessage,
  guard: (inspect, fallback) => {
    try {
      return inspect()
    } catch {
      return fallback
    }
  },
}

// The inspection of the call the current code belongs to.
const callInspection = new AsyncLocalStorage<Inspection>()

/** Run `run` so the device helpers in it read thrown values and abort reasons through `inspection`. */
export function runInspecting<T>(inspection: Inspection, run: () => T): T {
  return callInspection.run(inspection, run)
}

/** The inspection of the call the current code belongs to, `PLAIN_INSPECTION` outside one. */
export function currentInspection(): Inspection {
  return callInspection.getStore() ?? PLAIN_INSPECTION
}

/** `error` as text through the current call's inspection. */
export function describeError(error: unknown): string {
  return currentInspection().describe(error)
}

/** Whether `value` is an instance of `type`, `false` when the current call's inspection is guarded and `instanceof` throws. */
export function isInstance<T>(
  value: unknown,
  type: abstract new (...args: never[]) => T,
): value is T {
  return currentInspection().guard(() => value instanceof type, false)
}

// Characters Python's str.isprintable() rejects, apart from the plain space.
const NON_PRINTABLE = /[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\p{Zl}\p{Zp}\p{Zs}]/u

function unboundedDelay(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000).unref())
}

function reprString(value: string): string {
  const quote = value.includes("'") && !value.includes('"') ? '"' : "'"
  let out = quote
  for (const character of value) {
    if (character === quote || character === '\\') {
      out += `\\${character}`
    } else if (character === '\n') {
      out += '\\n'
    } else if (character === '\r') {
      out += '\\r'
    } else if (character === '\t') {
      out += '\\t'
    } else if (character !== ' ' && NON_PRINTABLE.test(character)) {
      const codePoint = character.codePointAt(0)!
      if (codePoint < 0x100) {
        out += `\\x${codePoint.toString(16).padStart(2, '0')}`
      } else if (codePoint < 0x10000) {
        out += `\\u${codePoint.toString(16).padStart(4, '0')}`
      } else {
        out += `\\U${codePoint.toString(16).padStart(8, '0')}`
      }
    } else {
      out += character
    }
  }
  return out + quote
}
