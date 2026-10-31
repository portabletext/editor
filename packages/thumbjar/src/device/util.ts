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
    if (signal.aborted) reject(signal.reason)
    else
      signal.addEventListener('abort', () => reject(signal.reason), {
        once: true,
      })
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
  if (parent?.aborted) controller.abort(parent.reason)
  else parent?.addEventListener('abort', onParentAbort, {once: true})
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
    if (controller.signal.aborted)
      await Promise.race([
        work.catch(() => {}),
        unboundedDelay(JOIN_GRACE_SECONDS),
      ])
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
      if (difference !== 0) return difference
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
  if (value === null || value === undefined) return 'None'
  if (typeof value === 'string') return reprString(value)
  if (typeof value === 'boolean') return value ? 'True' : 'False'
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return `[${value.map(pyRepr).join(', ')}]`
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

// Characters Python's str.isprintable() rejects, apart from the plain space.
const NON_PRINTABLE = /[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\p{Zl}\p{Zp}\p{Zs}]/u

function unboundedDelay(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000).unref())
}

function reprString(value: string): string {
  const quote = value.includes("'") && !value.includes('"') ? '"' : "'"
  let out = quote
  for (const character of value) {
    if (character === quote || character === '\\') out += '\\' + character
    else if (character === '\n') out += '\\n'
    else if (character === '\r') out += '\\r'
    else if (character === '\t') out += '\\t'
    else if (character !== ' ' && NON_PRINTABLE.test(character)) {
      const codePoint = character.codePointAt(0)!
      if (codePoint < 0x100)
        out += '\\x' + codePoint.toString(16).padStart(2, '0')
      else if (codePoint < 0x10000)
        out += '\\u' + codePoint.toString(16).padStart(4, '0')
      else out += '\\U' + codePoint.toString(16).padStart(8, '0')
    } else out += character
  }
  return out + quote
}
