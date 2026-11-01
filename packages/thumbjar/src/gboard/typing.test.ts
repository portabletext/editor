import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {JSDOM} from 'jsdom'
import {beforeEach, describe, expect, test, vi} from 'vitest'
import {adb} from '../device/adb.ts'
import {prefixedPageUrl} from '../device/page-url.ts'
import {recordInput} from '../page.ts'
import {FIELD_RECT} from './field.ts'
import {packageKeys} from './hierarchy.ts'
import {
  compositionstartPerWord,
  isJapanese,
  keyboardState,
  nestedCompositionstart,
  openInChrome,
  typeInChrome,
  unexpectedDigit,
  type TypeOnDeviceOptions,
} from './typing.ts'

const fake = vi.hoisted(() => ({
  window: undefined as (Window & typeof globalThis) | undefined,
  timeline: [] as string[],
  foreground: '',
  opened: (_opens: number) => {},
  opens: 0,
  pageModule: undefined as (() => void) | undefined,
}))

vi.mock(import('../device/adb.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  adb: vi.fn((args: string[]) => {
    if (args[1]?.startsWith('am start')) {
      fake.opens += 1
      fake.timeline.push('open')
      fake.opened(fake.opens)
    }
    return Promise.resolve('')
  }),
}))

vi.mock(import('../device/cdp.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  cdpEval: (expression: string) => {
    fake.timeline.push(
      `cdp ${expression === FIELD_RECT ? 'FIELD_RECT' : expression}`,
    )
    return Promise.resolve(fake.window!.eval(expression))
  },
}))

vi.mock(import('../device/util.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  sleep: (seconds: number) => {
    fake.timeline.push(`sleep ${seconds}`)
    const pageModule = fake.pageModule
    fake.pageModule = undefined
    pageModule?.()
    return Promise.resolve()
  },
  phase: (message: string) => {
    fake.timeline.push(`phase ${message}`)
  },
}))

beforeEach(() => {
  vi.mocked(adb).mockClear()
  fake.timeline = []
  fake.opens = 0
  fake.opened = () => {}
  fake.pageModule = undefined
  vi.unstubAllGlobals()
})

describe(nestedCompositionstart.name, () => {
  test('the Japanese empty-block run restarted the composition once', () => {
    expect(
      nestedCompositionstart(fixtureEvents('ja-editor-empty.json')),
    ).toEqual(1)
  })

  test('the English run composes nothing', () => {
    expect(
      nestedCompositionstart(fixtureEvents('en-plain-empty.json')),
    ).toEqual(0)
  })
})

describe(compositionstartPerWord.name, () => {
  test('the Japanese empty-block run started two compositions in the first word and one in the second', () => {
    expect(
      compositionstartPerWord(fixtureEvents('ja-editor-empty.json'), [17, 38]),
    ).toEqual([2, 1])
  })

  test('the Japanese run after existing text started one composition per word', () => {
    expect(
      compositionstartPerWord(fixtureEvents('ja-editor-prefix.json'), [17, 34]),
    ).toEqual([1, 1])
  })
})

describe(unexpectedDigit.name, () => {
  test('a digit the inputs do not hold is found, ASCII or full width', () => {
    expect([
      unexpectedDigit('K7ou kyou ', 'kyoukyou'),
      unexpectedDigit('ｋ７', 'kyou'),
      unexpectedDigit('x7kyou ', 'x7kyou'),
      unexpectedDigit('今日今日', 'kyoukyou'),
      unexpectedDigit(null, 'kyou'),
    ]).toEqual(['7', '７', undefined, undefined, undefined])
  })
})

describe(isJapanese.name, () => {
  test('only the Japanese QWERTY dump reads as Japanese', () => {
    expect(
      [
        'en-keyboard.xml',
        'ja-banner.xml',
        'ja-next-language.xml',
        'ja-keyboard.xml',
      ].map((fixture) =>
        isJapanese(
          packageKeys(
            readFileSync(
              new URL(`../fixtures/${fixture}`, import.meta.url),
              'utf8',
            ),
            'com.google.android.inputmethod.latin',
          ).keys(),
        ),
      ),
    ).toEqual([false, false, false, true])
  })
})

describe(keyboardState.name, () => {
  test('the recorded dumps read as the English layout, the banner, the English layout and Japanese QWERTY', () => {
    expect(
      [
        'en-keyboard.xml',
        'ja-banner.xml',
        'ja-next-language.xml',
        'ja-keyboard.xml',
        'no-gboard.xml',
      ].map((fixture) => keyboardState(fixtureKeys(fixture))),
    ).toEqual(['other', 'banner', 'other', 'japanese-qwerty', 'partial'])
  })

  test('a Japanese dump taken mid-redraw, with its space key and hints but without every letter, is partial', () => {
    const keys = fixtureKeys('ja-keyboard.xml')
    keys.delete('k')

    expect(keyboardState(keys)).toEqual('partial')
  })

  test('an English dump that lost a toolbar label is still the English layout, not a switch', () => {
    const keys = fixtureKeys('en-keyboard.xml')
    keys.delete('Clipboard')

    expect(keyboardState(keys)).toEqual('other')
  })
})

describe(openInChrome.name, () => {
  test('the device shell hands Chrome the whole URL, query, fragment and all', async () => {
    await openInChrome(
      prefixedPageUrl('http://localhost:8765/editor.html?mode=a#field', 'あ'),
    )

    expect(
      vi.mocked(adb).mock.calls.map(([args]) => deviceShellArguments(args)),
    ).toEqual([
      [
        'am',
        'start',
        '-a',
        'android.intent.action.VIEW',
        '-d',
        'http://localhost:8765/editor.html?mode=a&prefix=%E3%81%82#field',
        'com.android.chrome',
      ],
    ])
  })
})

describe(typeInChrome.name, () => {
  test('after Chrome reopens the page, the driver taps the field the page names', async () => {
    fake.foreground = 'com.google.android.apps.nexuslauncher'
    fake.opened = (opens) => {
      loadNamedTextareaPage()
      if (opens === 2) {
        fake.foreground = 'com.android.chrome'
      }
    }

    await expect(
      typeInChrome('reopen', options, connectDevice),
    ).rejects.toThrow('stop after the tap')

    expect(fake.timeline.filter((entry) => !entry.startsWith('phase'))).toEqual(
      [
        'open',
        'sleep 4',
        'cdp document.readyState',
        'cdp typeof window.__state',
        'cdp location.href',
        'open',
        'cdp document.readyState',
        'cdp typeof window.__state',
        'sleep 1',
        'cdp document.readyState',
        'cdp typeof window.__state',
        'cdp FIELD_RECT',
        'tap 110,60',
      ],
    )
  })

  test('while Chrome stays in front, the driver waits for the page once and taps its field', async () => {
    fake.foreground = 'com.android.chrome'
    fake.opened = () => loadNamedTextareaPage()

    await expect(
      typeInChrome('loaded', options, connectDevice),
    ).rejects.toThrow('stop after the tap')

    expect(fake.timeline).toEqual([
      'phase adb reverse/forward set',
      'phase uiautomator2 up: fake (1080, 2400)',
      'open',
      'phase chrome launched',
      'sleep 4',
      "phase foreground: {'package': 'com.android.chrome', 'activity': 'Main', 'pid': 1}",
      'cdp document.readyState',
      'cdp typeof window.__state',
      'cdp location.href',
      'phase page loaded: https://example.test/textarea.html?prefix=',
      "phase before field lookup: {'package': 'com.android.chrome', 'activity': 'Main', 'pid': 1}",
      'cdp FIELD_RECT',
      "phase field rect {'x': 110, 'y': 60, 'devicePixelRatio': 1, 'innerHeight': 768, 'screenHeight': 768}, tapping 110,60 on 1080x2400",
      'tap 110,60',
    ])
  })

  test('a page ready on the twentieth check is typed into', async () => {
    fake.foreground = 'com.android.chrome'
    fake.opened = () => {
      loadNamedTextareaPage()
      const pageModule = fake.pageModule!
      let sleeps = 0
      const runOnTwentiethSleep = () => {
        sleeps += 1
        if (sleeps === 20) {
          pageModule()
        } else {
          fake.pageModule = runOnTwentiethSleep
        }
      }
      fake.pageModule = runOnTwentiethSleep
    }

    await expect(typeInChrome('late', options, connectDevice)).rejects.toThrow(
      'stop after the tap',
    )

    expect(fake.timeline.filter((entry) => !entry.startsWith('phase'))).toEqual(
      [
        'open',
        'sleep 4',
        ...Array.from({length: 19}, () => [
          'cdp document.readyState',
          'cdp typeof window.__state',
          'sleep 1',
        ]).flat(),
        'cdp document.readyState',
        'cdp typeof window.__state',
        'cdp location.href',
        'cdp FIELD_RECT',
        'tap 110,60',
      ],
    )
  })

  test('a page that never runs `recordInput` fails after twenty checks', async () => {
    fake.foreground = 'com.android.chrome'
    fake.opened = () => {
      loadNamedTextareaPage()
      fake.pageModule = undefined
    }

    await expect(typeInChrome('never', options, connectDevice)).rejects.toThrow(
      new Error('page never loaded over CDP: None'),
    )

    expect(fake.timeline.filter((entry) => !entry.startsWith('phase'))).toEqual(
      [
        'open',
        'sleep 4',
        ...Array.from({length: 20}, () => [
          'cdp document.readyState',
          'cdp typeof window.__state',
          'sleep 1',
        ]).flat(),
      ],
    )
  })
})

const options: TypeOnDeviceOptions = {
  url: 'https://example.test/textarea.html',
  keyboard: 'en',
  prefix: '',
  words: [],
}

function loadNamedTextareaPage(): void {
  const {window} = new JSDOM(
    '<div contenteditable="true">bar</div><textarea>foo</textarea>',
    {url: prefixedPageUrl(options.url, ''), runScripts: 'outside-only'},
  )
  Object.defineProperty(window.screen, 'height', {value: 768})
  window.document.querySelector('div')!.getBoundingClientRect = () =>
    new window.DOMRect(0, 0, 10, 10)
  const field = window.document.querySelector('textarea')!
  field.getBoundingClientRect = () => new window.DOMRect(10, 20, 200, 80)
  fake.window = window as unknown as Window & typeof globalThis
  fake.pageModule = () => {
    vi.stubGlobal('window', window)
    vi.stubGlobal('document', window.document)
    recordInput({getText: () => field.value, field})
  }
}

function connectDevice() {
  return Promise.resolve({
    info: () => Promise.resolve({productName: 'fake'}),
    windowSize: () => Promise.resolve([1080, 2400]),
    appCurrent: () =>
      Promise.resolve({package: fake.foreground, activity: 'Main', pid: 1}),
    screenshot: () => Promise.resolve(),
    find: () => ({exists: () => Promise.resolve(false)}),
    click: (x: number, y: number) => {
      fake.timeline.push(`tap ${x},${y}`)
      return Promise.reject(new Error('stop after the tap'))
    },
  } as never)
}

/**
 * The arguments `am` receives on the device. `adb shell` joins its arguments with spaces into one command
 * for the device's POSIX shell, so this runs that command with `am` replaced by a recorder.
 */
function deviceShellArguments(args: string[]): string[] {
  expect(args[0]).toEqual('shell')
  const {error, signal, status, stdout} = spawnSync(
    '/bin/sh',
    ['-c', `am() { printf '%s\\0' am "$@"; }; ${args.slice(1).join(' ')}`],
    {encoding: 'utf8'},
  )
  expect({error, signal, status}).toEqual({
    error: undefined,
    signal: null,
    status: 0,
  })
  return stdout.split('\0').slice(0, -1)
}

function fixtureKeys(fixture: string): Map<string, [number, number]> {
  return packageKeys(
    readFileSync(new URL(`../fixtures/${fixture}`, import.meta.url), 'utf8'),
    'com.google.android.inputmethod.latin',
  )
}

function fixtureEvents(fixture: string): Array<{type: string}> {
  return JSON.parse(
    readFileSync(new URL(`../fixtures/${fixture}`, import.meta.url), 'utf8'),
  ).state.events
}
