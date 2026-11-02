import {mkdtempSync, readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {JSDOM} from 'jsdom'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import {adb} from '../device/adb.ts'
import {recordInput} from '../page.ts'
import {openScratchKeyboard, scratchKeyboard} from './scratch-keyboard.ts'

const fake = vi.hoisted(() => ({
  window: undefined as (Window & typeof globalThis) | undefined,
  timeline: [] as string[],
  foreground: '',
  opened: (_opens: number) => {},
  opens: 0,
  inputShown: true,
}))

vi.mock(import('../device/adb.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  adb: vi.fn((args: string[]) => {
    if (args[1]?.startsWith('am start')) {
      fake.opens += 1
      fake.timeline.push('open')
      fake.opened(fake.opens)
    }
    if (args.includes('input_method')) {
      return Promise.resolve(fake.inputShown ? 'mInputShown=true' : '')
    }
    if (args[1] === 'log') {
      fake.timeline.push(`mark ${args.at(-1)}`)
    }
    return Promise.resolve('')
  }),
}))

vi.mock(import('../device/cdp.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  cdpEval: (expression: string) =>
    Promise.resolve(fake.window!.eval(expression)),
}))

vi.mock(import('../device/util.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  sleep: () => Promise.resolve(),
  phase: () => {},
}))

const GBOARD_KEYS = {
  english: fixture('en-keyboard.xml'),
  englishWithLanguageKey: fixture('ja-next-language.xml'),
  japanese: fixture('ja-keyboard.xml'),
}

beforeEach(() => {
  vi.mocked(adb).mockClear()
  fake.timeline = []
  fake.opens = 0
  fake.opened = () => {}
  fake.inputShown = true
  vi.stubEnv(
    'THUMBJAR_OUT_DIR',
    mkdtempSync(join(tmpdir(), 'thumbjar-scratch-')),
  )
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe(openScratchKeyboard.name, () => {
  test('taps Wait on an ANR dialog before it looks for the field', async () => {
    fake.foreground = 'com.android.chrome'
    fake.opened = () => loadScratchPage()
    const device = fakeDevice({dumps: [GBOARD_KEYS.english], anr: true})

    await openScratchKeyboard('https://example.test/textarea.html', () =>
      Promise.resolve(device.device),
    )

    expect(
      fake.timeline.filter(
        (entry) => entry === 'open' || entry.startsWith('tap'),
      ),
    ).toEqual(['open', 'tap Wait', 'tap 110,60'])
  })

  test('opens the page again when Chrome is not in front once it loaded, before it taps the field', async () => {
    fake.foreground = 'com.google.android.apps.nexuslauncher'
    fake.opened = (opens) => {
      loadScratchPage()
      if (opens === 2) {
        fake.foreground = 'com.android.chrome'
      }
    }
    const device = fakeDevice({dumps: [GBOARD_KEYS.english]})

    await openScratchKeyboard('https://example.test/textarea.html', () =>
      Promise.resolve(device.device),
    )

    expect(
      fake.timeline.filter(
        (entry) => entry === 'open' || entry.startsWith('tap'),
      ),
    ).toEqual(['open', 'open', 'tap 110,60'])
  })

  test('leaves Gboard on the layout it opened on', async () => {
    fake.foreground = 'com.android.chrome'
    fake.opened = () => loadScratchPage()
    const device = fakeDevice({dumps: [GBOARD_KEYS.englishWithLanguageKey]})

    await openScratchKeyboard('https://example.test/textarea.html', () =>
      Promise.resolve(device.device),
    )

    expect(fake.timeline.filter((entry) => entry.startsWith('tap'))).toEqual([
      'tap 110,60',
    ])
  })
})

describe(scratchKeyboard.name, () => {
  test('swipes Space to reach Japanese when the English layout shows no language key', async () => {
    const device = fakeDevice({
      dumps: [GBOARD_KEYS.english],
      onSwipe: () => [GBOARD_KEYS.japanese],
    })

    await scratchKeyboard(device.device, 'out').switchToJapanese()

    expect(
      fake.timeline.filter(
        (entry) => entry.startsWith('tap') || entry.startsWith('swipe'),
      ),
    ).toEqual(['swipe 443,2196 -> 743,2196'])
  })

  test('taps the language key to reach Japanese when the layout shows one', async () => {
    const device = fakeDevice({
      dumps: [GBOARD_KEYS.englishWithLanguageKey],
      onTap: (label) =>
        label === 'Next language' ? [GBOARD_KEYS.japanese] : undefined,
    })

    await scratchKeyboard(device.device, 'out').switchToJapanese()

    expect(
      fake.timeline.filter(
        (entry) => entry.startsWith('tap') || entry.startsWith('swipe'),
      ),
    ).toEqual(['tap Next language'])
  })

  test('refuses a Japanese layout that is not romaji QWERTY', async () => {
    const device = fakeDevice({
      dumps: [GBOARD_KEYS.englishWithLanguageKey],
      onTap: (label) =>
        label === 'Next language'
          ? [withoutKey(GBOARD_KEYS.japanese, 'k')]
          : undefined,
    })

    await expect(
      scratchKeyboard(device.device, 'out').switchToJapanese(),
    ).rejects.toThrow('japanese layout is not romaji QWERTY')
  })

  test('logs its marker to the capture before it switches', async () => {
    const device = fakeDevice({
      dumps: [GBOARD_KEYS.englishWithLanguageKey],
      onTap: (label) =>
        label === 'Next language' ? [GBOARD_KEYS.japanese] : undefined,
    })
    const keyboard = scratchKeyboard(device.device, 'out')

    const marker = await keyboard.markCapture()
    await keyboard.switchToJapanese()

    expect(
      fake.timeline.filter(
        (entry) => entry.startsWith('tap') || entry.startsWith('mark'),
      ),
    ).toEqual([`mark ${marker}`, 'tap Next language'])
  })
})

function fixture(name: string): string {
  return readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8')
}

/** `xml` with the Gboard key labelled `label` relabelled, as a Japanese layout other than romaji QWERTY lacks it. */
function withoutKey(xml: string, label: string): string {
  return xml.replaceAll(`content-desc="${label}"`, 'content-desc="か"')
}

/** A page with a textarea at (110, 60) that installs `window.__state`, as the scratch page does. */
function loadScratchPage(): void {
  const {window} = new JSDOM('<textarea></textarea>', {
    url: 'https://example.test/textarea.html?prefix=',
    runScripts: 'outside-only',
  })
  Object.defineProperty(window.screen, 'height', {value: 768})
  const field = window.document.querySelector('textarea')!
  field.getBoundingClientRect = () => new window.DOMRect(10, 20, 200, 80)
  fake.window = window as unknown as Window & typeof globalThis
  for (const global of [
    'document',
    'HTMLElement',
    'HTMLTextAreaElement',
    'HTMLInputElement',
    'InputEvent',
    'CompositionEvent',
  ] as const) {
    vi.stubGlobal(global, window[global])
  }
  vi.stubGlobal('window', window)
  recordInput({getText: () => field.value, field})
}

/**
 * A uiautomator2 device whose Gboard dumps come from `dumps`, last one repeating. A tap on a Gboard key
 * calls `onTap` with its label and a swipe calls `onSwipe`, and either may return the dumps that follow.
 * With `anr`, an "isn't responding" dialog shows until its Wait button is tapped.
 */
function fakeDevice({
  dumps,
  onTap = () => undefined,
  onSwipe = () => undefined,
  anr = false,
}: {
  dumps: string[]
  onTap?: (label: string) => string[] | undefined
  onSwipe?: () => string[] | undefined
  anr?: boolean
}) {
  let queue = [...dumps]
  let dialog = anr
  const current = () => queue[0]!
  const advance = () => {
    if (queue.length > 1) {
      queue = queue.slice(1)
    }
  }
  const labelAt = (x: number, y: number) =>
    [
      ...current().matchAll(
        /content-desc="([^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g,
      ),
    ].find(
      (match) =>
        Math.floor((Number(match[2]) + Number(match[4])) / 2) === x &&
        Math.floor((Number(match[3]) + Number(match[5])) / 2) === y,
    )?.[1]
  const device = {
    waitTimeout: 10,
    info: () => Promise.resolve({productName: 'fake'}),
    windowSize: () => Promise.resolve([1080, 2400]),
    appCurrent: () =>
      Promise.resolve({package: fake.foreground, activity: 'Main', pid: 1}),
    screenshot: () => Promise.resolve(),
    find: (selector: {textContains?: string; text?: string}) => ({
      exists: () =>
        Promise.resolve(
          dialog &&
            (selector.textContains === "isn't responding" ||
              selector.text === 'Wait'),
        ),
      getText: () => Promise.resolve("Pixel Launcher isn't responding"),
      click: () => {
        if (dialog && selector.text === 'Wait') {
          fake.timeline.push('tap Wait')
          dialog = false
        }
        return Promise.resolve()
      },
    }),
    dumpHierarchy: () => {
      const dump = current()
      advance()
      return Promise.resolve(dump)
    },
    click: (x: number, y: number) => {
      const label = labelAt(x, y)
      fake.timeline.push(label === undefined ? `tap ${x},${y}` : `tap ${label}`)
      const next = label === undefined ? undefined : onTap(label)
      if (next !== undefined) {
        queue = next
      }
      return Promise.resolve()
    },
    swipe: (fromX: number, fromY: number, toX: number, toY: number) => {
      fake.timeline.push(`swipe ${fromX},${fromY} -> ${toX},${toY}`)
      const next = onSwipe()
      if (next !== undefined) {
        queue = next
      }
      return Promise.resolve()
    },
  }
  return {device: device as never}
}
