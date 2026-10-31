import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {describe, expect, test, vi} from 'vitest'
import {adb} from '../device/adb.ts'
import {prefixedPageUrl} from '../device/page-url.ts'
import {packageKeys} from './hierarchy.ts'
import {
  compositionstartPerWord,
  isJapanese,
  keyboardState,
  nestedCompositionstart,
  openInChrome,
  unexpectedDigit,
} from './typing.ts'

vi.mock(import('../device/adb.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  adb: vi.fn(() => Promise.resolve('')),
}))

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
