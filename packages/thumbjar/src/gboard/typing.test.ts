import {spawnSync} from 'node:child_process'
import {mkdtempSync, readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {JSDOM} from 'jsdom'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  onTestFinished,
  test,
  vi,
} from 'vitest'
import {adb} from '../device/adb.ts'
import {prefixedPageUrl} from '../device/page-url.ts'
import {recordInput} from '../page.ts'
import {FIELD_RECT, FOCUS_FIELD} from './field.ts'
import {packageKeys, packageNodes} from './hierarchy.ts'
import {
  compositionstartPerWord,
  graphemeOffset,
  isJapanese,
  keyboardState,
  nestedCompositionstart,
  openInChrome,
  roleKey,
  runInChrome,
  typeInChrome,
  unexpectedDigit,
  withStepRecords,
  type TypeOnDeviceOptions,
} from './typing.ts'

const fake = vi.hoisted(() => ({
  window: undefined as (Window & typeof globalThis) | undefined,
  timeline: [] as string[],
  foreground: '',
  opened: (_opens: number) => {},
  opens: 0,
  pageModule: undefined as (() => void) | undefined,
  evaluating: (_expression: string) => {},
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
    fake.evaluating(expression)
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
  fake.evaluating = () => {}
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

  test('a malformed word throws when the driver reaches it, after the words before it are typed', async () => {
    vi.stubEnv('THUMBJAR_OUT_DIR', mkdtempSync(join(tmpdir(), 'thumbjar-run-')))
    const adbImplementation = vi.mocked(adb).getMockImplementation()!
    vi.mocked(adb).mockImplementation((args) =>
      args.includes('input_method')
        ? Promise.resolve('mInputShown=true')
        : adbImplementation(args),
    )
    onTestFinished(() => {
      vi.mocked(adb).mockImplementation(adbImplementation)
      vi.unstubAllEnvs()
    })
    fake.foreground = 'com.android.chrome'
    fake.opened = () => loadGboardTextareaPage('', 'en-keyboard.xml')

    await expect(
      typeInChrome(
        'null-word',
        {...options, words: [{letters: 'foo'}, null as never]},
        connectGboard,
      ),
    ).rejects.toThrow(
      new TypeError("Cannot read properties of null (reading 'letters')"),
    )

    expect(fake.timeline.filter((entry) => entry.startsWith('tap'))).toEqual([
      'tap 110,60',
      'tap 432,1885',
      'tap 914,1731',
      'tap 914,1731',
      'tap 593,2196',
    ])
  })
})

describe(roleKey.name, () => {
  test('finds Enter and Delete by resource id on both layouts', () => {
    expect(
      ['en-keyboard.xml', 'ja-keyboard.xml'].map((fixture) => {
        const nodes = fixtureNodes(fixture)
        return [roleKey(nodes, 'enter'), roleKey(nodes, 'delete')]
      }),
    ).toEqual([
      [
        {label: 'Enter', id: 'key_pos_ime_action', center: [994, 2196]},
        {label: 'Delete', id: 'key_pos_del', center: [994, 2040]},
      ],
      [
        {label: 'Enter', id: 'key_pos_ime_action', center: [994, 2196]},
        {label: '削除', id: 'key_pos_del', center: [994, 2040]},
      ],
    ])
  })

  test('falls back to the label when the dump has no resource ids', () => {
    const nodes = fixtureNodes('ja-keyboard.xml').map((node) => ({
      ...node,
      id: '',
    }))

    expect([roleKey(nodes, 'enter'), roleKey(nodes, 'delete')]).toEqual([
      {label: 'Enter', id: '', center: [994, 2196]},
      {label: '削除', id: '', center: [994, 2040]},
    ])
  })
})

describe(graphemeOffset.name, () => {
  test('counts grapheme clusters, not UTF-16 code units', () => {
    expect([
      graphemeOffset('foo', 2),
      graphemeOffset('👍🏽foo', 4),
      graphemeOffset('👍🏽foo', 6),
      graphemeOffset('नमस्ते', 6),
    ]).toEqual([2, 1, 3, 3])
  })
})

describe(withStepRecords.name, () => {
  test('a step field that cannot be converted to text is shown as such, and the error stays the cause', () => {
    const tapFailed = new Error('tap failed')
    const unprintable = {
      toString: () => {
        throw new Error('toString failed')
      },
    }
    const throwingGetter = Object.defineProperty({}, 'text', {
      enumerable: true,
      get: () => {
        throw new Error('getter failed')
      },
    })

    const error = withStepRecords(tapFailed, [
      {
        type: unprintable,
        status: 'done',
        textAfter: 'foo',
        selectionAfter: null,
        events: [],
      },
      {
        type: 'enter',
        status: 'failed',
        reason: unprintable,
        textAfter: null,
        selectionAfter: null,
        events: [],
      },
      {
        type: 'backspace',
        status: 'skipped',
        reason: 'step 2 failed',
        textAfter: throwingGetter,
        selectionAfter: null,
        events: [],
      },
    ] as never)

    expect({
      message: error.message,
      isCause: error.cause === tapFailed,
    }).toEqual({
      message: [
        'tap failed',
        'Steps:',
        "  1. <thrown value that cannot be converted to text>: done, textAfter 'foo'",
        '  2. enter: failed (<thrown value that cannot be converted to text>), textAfter None',
        '  3. backspace: skipped (step 2 failed), textAfter <thrown value that cannot be converted to text>',
      ].join('\n'),
      isCause: true,
    })
  })
})

describe(runInChrome.name, () => {
  const adbImplementation = vi.mocked(adb).getMockImplementation()!

  beforeEach(() => {
    vi.stubEnv('THUMBJAR_OUT_DIR', mkdtempSync(join(tmpdir(), 'thumbjar-run-')))
    // Gboard shows once the field is tapped.
    vi.mocked(adb).mockImplementation((args) =>
      args.includes('input_method')
        ? Promise.resolve('mInputShown=true')
        : adbImplementation(args),
    )
    fake.foreground = 'com.android.chrome'
  })

  afterEach(() => {
    vi.mocked(adb).mockImplementation(adbImplementation)
    vi.unstubAllEnvs()
  })

  test('Enter taps the action key and records the line break', async () => {
    fake.opened = () => loadGboardTextareaPage('foo', 'en-keyboard.xml')

    const run = await runInChrome(
      'enter',
      {...runOptions, prefix: 'foo', steps: [{type: 'enter'}]},
      connectGboard,
    )

    expect({
      taps: fake.timeline.filter((entry) => entry.startsWith('tap')),
      run,
    }).toEqual({
      taps: ['tap 110,60', 'tap 994,2196'],
      run: {
        steps: [
          {
            type: 'enter',
            status: 'done',
            textAfter: 'foo\n',
            selectionAfter: {anchor: 4, focus: 4},
            events: [
              {
                type: 'beforeinput',
                inputType: 'insertLineBreak',
                data: null,
                text: 'foo',
              },
              {
                type: 'input',
                inputType: 'insertLineBreak',
                data: null,
                text: 'foo\n',
              },
            ],
          },
        ],
        text: 'foo\n',
        selection: {anchor: 4, focus: 4},
        events: [
          {
            type: 'beforeinput',
            inputType: 'insertLineBreak',
            data: null,
            text: 'foo',
          },
          {
            type: 'input',
            inputType: 'insertLineBreak',
            data: null,
            text: 'foo\n',
          },
        ],
      },
    })
  })

  test('Backspace taps the Japanese delete key once per time and records the selection in grapheme clusters', async () => {
    fake.opened = () => loadGboardTextareaPage('👍🏽foo', 'ja-keyboard.xml')

    const run = await runInChrome(
      'backspace',
      {
        ...runOptions,
        keyboard: 'ja',
        prefix: '👍🏽foo',
        steps: [{type: 'backspace'}, {type: 'backspace', times: 2}],
      },
      connectGboard,
    )

    expect({
      taps: fake.timeline.filter((entry) => entry.startsWith('tap')),
      run,
    }).toEqual({
      taps: ['tap 110,60', 'tap 994,2040', 'tap 994,2040', 'tap 994,2040'],
      run: {
        steps: [
          {
            type: 'backspace',
            status: 'done',
            textAfter: '👍🏽fo',
            selectionAfter: {anchor: 3, focus: 3},
            events: [
              {
                type: 'beforeinput',
                inputType: 'deleteContentBackward',
                data: null,
                text: '👍🏽foo',
              },
              {
                type: 'input',
                inputType: 'deleteContentBackward',
                data: null,
                text: '👍🏽fo',
              },
            ],
          },
          {
            type: 'backspace',
            status: 'done',
            textAfter: '👍🏽',
            selectionAfter: {anchor: 1, focus: 1},
            events: [
              {
                type: 'beforeinput',
                inputType: 'deleteContentBackward',
                data: null,
                text: '👍🏽fo',
              },
              {
                type: 'input',
                inputType: 'deleteContentBackward',
                data: null,
                text: '👍🏽f',
              },
              {
                type: 'beforeinput',
                inputType: 'deleteContentBackward',
                data: null,
                text: '👍🏽f',
              },
              {
                type: 'input',
                inputType: 'deleteContentBackward',
                data: null,
                text: '👍🏽',
              },
            ],
          },
        ],
        text: '👍🏽',
        selection: {anchor: 1, focus: 1},
        events: [
          {
            type: 'beforeinput',
            inputType: 'deleteContentBackward',
            data: null,
            text: '👍🏽foo',
          },
          {
            type: 'input',
            inputType: 'deleteContentBackward',
            data: null,
            text: '👍🏽fo',
          },
          {
            type: 'beforeinput',
            inputType: 'deleteContentBackward',
            data: null,
            text: '👍🏽fo',
          },
          {
            type: 'input',
            inputType: 'deleteContentBackward',
            data: null,
            text: '👍🏽f',
          },
          {
            type: 'beforeinput',
            inputType: 'deleteContentBackward',
            data: null,
            text: '👍🏽f',
          },
          {
            type: 'input',
            inputType: 'deleteContentBackward',
            data: null,
            text: '👍🏽',
          },
        ],
      },
    })
  })

  test("`letters: 'k'` taps the K key whether Gboard labels it with a capital or not", async () => {
    const taps: Record<string, string[]> = {}
    for (const [layout, keyboard, fixture, editDump] of [
      ['en capitals', 'en', 'en-keyboard.xml', undefined],
      [
        'en lowercase',
        'en',
        'en-keyboard.xml',
        (xml: string) =>
          xml.replace(
            /content-desc="([A-Z])"/g,
            (_label, letter: string) =>
              `content-desc="${letter.toLowerCase()}"`,
          ),
      ],
      ['ja lowercase', 'ja', 'ja-keyboard.xml', undefined],
    ] as const) {
      fake.timeline = []
      fake.opened = () => loadGboardTextareaPage('foo', fixture, editDump)
      await runInChrome(
        layout,
        {
          ...runOptions,
          keyboard,
          prefix: 'foo',
          steps: [{type: 'compose', letters: 'k', commit: 'none'}],
        },
        connectGboard,
      )
      taps[layout] = fake.timeline.filter((entry) => entry.startsWith('tap'))
    }

    expect(taps).toEqual({
      'en capitals': ['tap 110,60', 'tap 860,1885'],
      'en lowercase': ['tap 110,60', 'tap 860,1885'],
      'ja lowercase': ['tap 110,60', 'tap 807,1885'],
    })
  })

  test('a case with no steps returns the text and selection of the boundary read after the field is focused', async () => {
    fake.opened = () => loadGboardTextareaPage('foo', 'en-keyboard.xml')

    expect(
      await runInChrome(
        'no-steps',
        {...runOptions, prefix: 'foo', steps: []},
        connectGboard,
      ),
    ).toEqual({
      steps: [],
      text: 'foo',
      selection: {anchor: 3, focus: 3},
      events: [],
    })
  })

  test('an event the page records before the first step is in no step record and not in the run', async () => {
    fake.opened = () => loadGboardTextareaPage('foo', 'en-keyboard.xml')
    fake.evaluating = (expression) => {
      if (expression === FOCUS_FIELD) {
        gboard.inputFromPage('focused')
      }
    }

    const run = await runInChrome(
      'pre-events',
      {...runOptions, prefix: 'foo', steps: [{type: 'enter'}]},
      connectGboard,
    )

    expect(run).toEqual({
      steps: [
        {
          type: 'enter',
          status: 'done',
          textAfter: 'foo\n',
          selectionAfter: {anchor: 4, focus: 4},
          events: [
            {
              type: 'beforeinput',
              inputType: 'insertLineBreak',
              data: null,
              text: 'foo',
            },
            {
              type: 'input',
              inputType: 'insertLineBreak',
              data: null,
              text: 'foo\n',
            },
          ],
        },
      ],
      text: 'foo\n',
      selection: {anchor: 4, focus: 4},
      events: [
        {
          type: 'beforeinput',
          inputType: 'insertLineBreak',
          data: null,
          text: 'foo',
        },
        {
          type: 'input',
          inputType: 'insertLineBreak',
          data: null,
          text: 'foo\n',
        },
      ],
    })
  })

  test("an event the page records as the driver reads it after a step is in that step's record, and in the run once", async () => {
    fake.opened = () => loadGboardTextareaPage('foo', 'en-keyboard.xml')
    let reads = 0
    fake.evaluating = (expression) => {
      if (expression.includes('selectionDirection')) {
        reads += 1
        gboard.inputFromPage(`read ${reads}`)
      }
    }

    const run = await runInChrome(
      'late-events',
      {
        ...runOptions,
        prefix: 'foo',
        steps: [{type: 'backspace'}, {type: 'enter'}],
      },
      connectGboard,
    )

    expect(run).toEqual({
      steps: [
        {
          type: 'backspace',
          status: 'done',
          textAfter: 'fo',
          selectionAfter: {anchor: 2, focus: 2},
          events: [
            {
              type: 'beforeinput',
              inputType: 'deleteContentBackward',
              data: null,
              text: 'foo',
            },
            {
              type: 'input',
              inputType: 'deleteContentBackward',
              data: null,
              text: 'fo',
            },
            {
              type: 'input',
              inputType: 'insertText',
              data: 'read 2',
              text: 'fo',
            },
          ],
        },
        {
          type: 'enter',
          status: 'done',
          textAfter: 'fo\n',
          selectionAfter: {anchor: 3, focus: 3},
          events: [
            {
              type: 'beforeinput',
              inputType: 'insertLineBreak',
              data: null,
              text: 'fo',
            },
            {
              type: 'input',
              inputType: 'insertLineBreak',
              data: null,
              text: 'fo\n',
            },
            {
              type: 'input',
              inputType: 'insertText',
              data: 'read 3',
              text: 'fo\n',
            },
          ],
        },
      ],
      text: 'fo\n',
      selection: {anchor: 3, focus: 3},
      events: [
        {
          type: 'beforeinput',
          inputType: 'deleteContentBackward',
          data: null,
          text: 'foo',
        },
        {
          type: 'input',
          inputType: 'deleteContentBackward',
          data: null,
          text: 'fo',
        },
        {type: 'input', inputType: 'insertText', data: 'read 2', text: 'fo'},
        {
          type: 'beforeinput',
          inputType: 'insertLineBreak',
          data: null,
          text: 'fo',
        },
        {
          type: 'input',
          inputType: 'insertLineBreak',
          data: null,
          text: 'fo\n',
        },
        {
          type: 'input',
          inputType: 'insertText',
          data: 'read 3',
          text: 'fo\n',
        },
      ],
    })
  })

  test('a step that throws is recorded as failed, the steps after it as skipped, and the attempt throws', async () => {
    fake.opened = () =>
      loadGboardTextareaPage('foo', 'en-keyboard.xml', (xml) =>
        xml
          .replaceAll('content-desc="Enter"', 'content-desc="Ok"')
          .replaceAll('key_pos_ime_action', 'key_pos_ok'),
      )

    await expect(
      runInChrome(
        'no-enter',
        {
          ...runOptions,
          prefix: 'foo',
          steps: [{type: 'backspace'}, {type: 'enter'}, {type: 'backspace'}],
        },
        connectGboard,
      ),
    ).rejects.toThrow('no Gboard enter key')

    expect(
      JSON.parse(
        readFileSync(
          join(process.env.THUMBJAR_OUT_DIR!, 'no-enter.json'),
          'utf8',
        ),
      ).records,
    ).toEqual([
      {
        type: 'backspace',
        status: 'done',
        textAfter: 'fo',
        selectionAfter: {anchor: 2, focus: 2},
        events: [
          {
            type: 'beforeinput',
            inputType: 'deleteContentBackward',
            data: null,
            text: 'foo',
          },
          {
            type: 'input',
            inputType: 'deleteContentBackward',
            data: null,
            text: 'fo',
          },
        ],
      },
      {
        type: 'enter',
        status: 'failed',
        reason: expect.stringMatching(/^Error: no Gboard enter key, labels: /),
        textAfter: null,
        selectionAfter: null,
        events: [],
      },
      {
        type: 'backspace',
        status: 'skipped',
        reason: 'step 2 failed',
        textAfter: null,
        selectionAfter: null,
        events: [],
      },
    ])
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

const runOptions = {
  url: 'https://example.test/textarea.html',
  keyboard: 'en' as const,
  prefix: '',
}

/**
 * A page with a `textarea` the page names, seeded with `prefix`, under a Gboard that shows `keyboard`.
 * Tapping its Enter or Delete key edits the `textarea` at its caret the way Chrome does for Gboard's key.
 */
function loadGboardTextareaPage(
  prefix: string,
  keyboard: string,
  editDump: (xml: string) => string = (xml) => xml,
): void {
  const {window} = new JSDOM('<textarea></textarea>', {
    url: prefixedPageUrl(runOptions.url, prefix),
    runScripts: 'outside-only',
  })
  Object.defineProperty(window.screen, 'height', {value: 768})
  const field = window.document.querySelector('textarea')!
  field.value = prefix
  field.getBoundingClientRect = () => new window.DOMRect(10, 20, 200, 80)
  fake.window = window as unknown as Window & typeof globalThis
  const dump = editDump(
    readFileSync(new URL(`../fixtures/${keyboard}`, import.meta.url), 'utf8'),
  )
  const keys = packageNodes(dump, 'com.google.android.inputmethod.latin')
  // Replaces the text before the caret with `edit`'s, firing `beforeinput` and `input` around it.
  const editField = (inputType: string, edit: (before: string) => string) => {
    field.dispatchEvent(new window.InputEvent('beforeinput', {inputType}))
    const before = edit(field.value.slice(0, field.selectionStart))
    field.value = before + field.value.slice(field.selectionEnd)
    field.setSelectionRange(before.length, before.length)
    field.dispatchEvent(new window.InputEvent('input', {inputType}))
  }
  gboard.dump = dump
  gboard.inputFromPage = (data) => {
    field.dispatchEvent(
      new window.InputEvent('input', {inputType: 'insertText', data}),
    )
  }
  gboard.tap = (x, y) => {
    const key = keys.find(
      (node) => node.center[0] === x && node.center[1] === y,
    )
    if (key?.id === 'key_pos_ime_action') {
      editField('insertLineBreak', (before) => `${before}\n`)
    }
    if (key?.id === 'key_pos_del') {
      editField('deleteContentBackward', (before) =>
        [...new Intl.Segmenter().segment(before)]
          .slice(0, -1)
          .map(({segment}) => segment)
          .join(''),
      )
    }
  }
  fake.pageModule = () => {
    vi.stubGlobal('window', window)
    vi.stubGlobal('document', window.document)
    for (const global of [
      'InputEvent',
      'CompositionEvent',
      'HTMLTextAreaElement',
      'HTMLInputElement',
    ] as const) {
      vi.stubGlobal(global, window[global])
    }
    recordInput({getText: () => field.value, field})
  }
}

const gboard = {
  dump: '',
  tap: (_x: number, _y: number) => {},
  /** Fire an `input` event of `data` on the field that changes nothing, as the page itself could. */
  inputFromPage: (_data: string) => {},
}

function connectGboard() {
  return Promise.resolve({
    info: () => Promise.resolve({productName: 'fake'}),
    windowSize: () => Promise.resolve([1080, 2400]),
    appCurrent: () =>
      Promise.resolve({package: fake.foreground, activity: 'Main', pid: 1}),
    screenshot: () => Promise.resolve(),
    find: () => ({exists: () => Promise.resolve(false)}),
    dumpHierarchy: () => Promise.resolve(gboard.dump),
    click: (x: number, y: number) => {
      fake.timeline.push(`tap ${x},${y}`)
      gboard.tap(x, y)
      return Promise.resolve()
    },
  } as never)
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

function fixtureNodes(fixture: string) {
  return packageNodes(
    readFileSync(new URL(`../fixtures/${fixture}`, import.meta.url), 'utf8'),
    'com.google.android.inputmethod.latin',
  )
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
