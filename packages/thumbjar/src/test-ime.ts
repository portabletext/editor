// Broadcast protocol ported from ianstormtaylor/slate (MIT), `playwright/devices/android/run.cjs`.
import {expect, vi} from 'vitest'
import {adb, shellQuote} from './device/adb.ts'
import {cdpEval, setCurrentUrl} from './device/cdp.ts'
import {FIELD_FOCUSED, FIELD_RECT, FOCUS_FIELD} from './gboard/field.ts'

export const ime = {
  compose: (text: string) => imeCommand('compose', {text}),
  commit: (text: string) => imeCommand('commit', {text}),
  finish: () => imeCommand('finish'),
  region: (start: number, end: number) =>
    imeCommand('region', {a: start, b: end}),
  select: (start: number, end: number) =>
    imeCommand('select', {a: start, b: end}),
  delete: (before: number, after: number) =>
    imeCommand('delete', {a: before, b: after}),
  key: (code: number) => imeCommand('key', {a: code}),
}

export async function openTestImePage(url: string): Promise<void> {
  setCurrentUrl(url)
  await adb([
    'shell',
    shellQuote([
      'am',
      'start',
      '-a',
      'android.intent.action.VIEW',
      '-d',
      url,
      'com.android.chrome',
    ]),
  ])
  await vi.waitFor(
    async () => {
      expect(
        await cdpEval(
          `location.href === ${JSON.stringify(url)} && typeof window.__selection === 'function'`,
        ),
      ).toEqual(true)
    },
    {timeout: 30_000},
  )
  const field = (await cdpEval(FIELD_RECT)) as {
    x: number
    y: number
    devicePixelRatio: number
    screenHeight: number
    innerHeight: number
  }
  await adb([
    'shell',
    'input',
    'tap',
    String(Math.trunc(field.x * field.devicePixelRatio)),
    String(
      Math.trunc(
        (field.y + field.screenHeight - field.innerHeight) *
          field.devicePixelRatio,
      ),
    ),
  ])
  await vi.waitFor(
    async () => {
      expect(await cdpEval(FIELD_FOCUSED)).toEqual(true)
      expect(await imeCommand('state')).toMatch(/^state:/)
    },
    {timeout: 10_000},
  )
  await cdpEval(FOCUS_FIELD)
}

export async function readImeSnapshot(): Promise<unknown> {
  await imeCommand('state')
  await cdpEval(
    `window.__imeFrameReady = false; requestAnimationFrame(() => requestAnimationFrame(() => { window.__imeFrameReady = true }))`,
  )
  await vi.waitFor(
    async () => {
      expect(
        await cdpEval(
          `window.__imeFrameReady && window.__state().events.every(event => !['beforeinput', 'input'].includes(event.type) || 'defaultPrevented' in event)`,
        ),
      ).toEqual(true)
    },
    {timeout: 10_000},
  )
  return cdpEval(`({state: window.__state(), selection: window.__selection()})`)
}

export async function addImeOutsideSibling(): Promise<void> {
  await cdpEval(
    `(() => { const paragraph = document.createElement('p'); paragraph.textContent = 'outside before'; window.__field().before(paragraph); })()`,
  )
}

async function imeCommand(
  op: string,
  {text, a, b}: {text?: string; a?: number; b?: number} = {},
): Promise<string> {
  const args = [
    'shell',
    'am',
    'broadcast',
    '-a',
    'org.slatejs.testime.COMMAND',
    '--es',
    'op',
    op,
  ]
  if (text !== undefined)
    args.push('--es', 'b64', Buffer.from(text, 'utf8').toString('base64'))
  if (a !== undefined) args.push('--ei', 'a', String(a))
  if (b !== undefined) args.push('--ei', 'b', String(b))
  const output = await adb(args)
  const result = /data="([^"]*)"/.exec(output)?.[1]
  if (
    !result ||
    result === 'error:no-input-connection' ||
    result.startsWith('error:unknown-op')
  )
    throw new Error(`test IME ${op}: ${result ?? output}`)
  return result
}
