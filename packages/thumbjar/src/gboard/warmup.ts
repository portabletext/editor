import {randomUUID} from 'node:crypto'
import {appendFileSync} from 'node:fs'
import {join} from 'node:path'
import {cdpEval} from '../device/cdp.ts'
import {purposePageUrl} from '../device/page-url.ts'
import {Device} from '../device/u2.ts'
import {
  closeChrome,
  dumpFailure,
  MistapError,
  runInChrome,
} from '../gboard/typing.ts'

export type WarmupOutcome = {
  attempt: number
  text: string | null
  outcome: 'pass' | 'retry' | 'fail'
}

export async function prepareEnglishKeyboard(
  out: string,
  pageUrl: string,
): Promise<void> {
  const url = purposePageUrl(pageUrl, 'english-warmup')
  const run = randomUUID()
  const devices: Device[] = []
  const connect = async () => {
    const device = await Device.connect()
    devices.push(device)
    return device
  }
  await warmEnglishKeyboard({
    type: async (attempt) => {
      await closeChrome()
      let dumped = false
      try {
        const run = await runInChrome(
          `en-warmup-${attempt}`,
          {
            url,
            keyboard: 'en',
            prefix: '',
            steps: [{type: 'compose', letters: 'hello', commit: 'space'}],
          },
          connect,
        )
        if (!isWarm(run.text)) {
          dumped = true
          await dumpFailure(`en-warmup-${attempt}`, connect)
        }
        return run.text
      } catch (error) {
        if (!dumped) {
          await dumpFailure(`en-warmup-${attempt}`, connect)
        }
        if (!(error instanceof MistapError)) {
          throw error
        }
        // The digit and symbol mistap checks run after the compose step, so the field holds the whole `hello` and Space attempt to record.
        const state: unknown = await cdpEval('window.__state()')
        if (
          state !== null &&
          typeof state === 'object' &&
          'text' in state &&
          (typeof state.text === 'string' || state.text === null)
        ) {
          return state.text
        }
        throw error
      }
    },
    record: (outcome) => {
      const endings: Record<string, string> = {
        ' ': ' and a trailing space',
        '\u00a0': ' and a non-breaking space',
      }
      const results = {retry: 'retrying', pass: 'passed', fail: 'failed'}
      const text = outcome.text
      const ending = text === null ? '' : (endings[text.slice(-1)] ?? '')
      const received =
        text === null
          ? 'no text'
          : `\`${ending ? text.slice(0, -1) : text}\`${ending}`
      const line = `- English Gboard warm-up, run ${run}, attempt ${outcome.attempt}: got ${received}, ${results[outcome.outcome]}\n`
      appendFileSync(
        join(out, 'en-warmup.jsonl'),
        `${JSON.stringify({run, ...outcome}).replaceAll('\u00a0', '\\u00a0')}\n`,
      )
      process.stdout.write(line)
      if (process.env.GITHUB_STEP_SUMMARY) {
        appendFileSync(process.env.GITHUB_STEP_SUMMARY, line)
      }
    },
    clear: closeChrome,
    dismiss: async () => {
      try {
        await closeChrome()
      } finally {
        for (const device of devices) {
          await device.close().catch(() => {})
        }
      }
    },
  })
}

export async function warmEnglishKeyboard(keyboard: {
  type(attempt: number): Promise<string | null>
  record(outcome: WarmupOutcome): void
  clear(): Promise<void>
  dismiss(): Promise<void>
}): Promise<void> {
  try {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const text = await keyboard.type(attempt)
      const passed = isWarm(text)
      keyboard.record({
        attempt,
        text,
        outcome: passed ? 'pass' : attempt < 3 ? 'retry' : 'fail',
      })
      await keyboard.clear()
      if (passed) {
        return
      }
    }
    throw new Error(
      'English Gboard warm-up: none of 3 attempts gave "Hello", ignoring case, see en-warmup.jsonl',
    )
  } finally {
    await keyboard.dismiss()
  }
}

function isWarm(text: string | null): boolean {
  return text?.replace(/[\u00a0 ]$/, '').toLowerCase() === 'hello'
}
