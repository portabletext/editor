import {expect, test} from 'vitest'
import {isHotkey, type KeyboardEventLike} from './is-hotkey'

function e(
  value: string | number,
  modifiers: Array<'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'> = [],
) {
  return {
    ...(typeof value === 'string' ? {key: value} : {keyCode: value}),
    altKey: modifiers.includes('altKey'),
    ctrlKey: modifiers.includes('ctrlKey'),
    metaKey: modifiers.includes('metaKey'),
    shiftKey: modifiers.includes('shiftKey'),
  } as KeyboardEventLike
}

type TestCase = [string, KeyboardEventLike, boolean]

const testCases: TestCase[] = [
  ['meta', e('Meta', ['metaKey']), true],
  ['Meta', e('Meta', ['metaKey']), true],
  ['meta', e(93, ['metaKey']), true],
  ['Meta', e(93, ['metaKey']), true],

  ['meta+s', e('s', ['metaKey']), true],
  ['Meta+S', e('s', ['metaKey']), true],
  ['meta+s', e(83, ['metaKey']), true],
  ['Meta+S', e(83, ['metaKey']), true],

  ['cmd+space', e(' ', ['metaKey']), true],
  ['Cmd+Space', e(' ', ['metaKey']), true],
  ['cmd+space', e(32, ['metaKey']), true],
  ['Cmd+Space', e(32, ['metaKey']), true],

  ['cmd+alt?+s', e('s', ['metaKey']), true],
  ['cmd+alt?+s', e('s', ['metaKey', 'altKey']), true],
  ['cmd+alt?+s', e(83, ['metaKey']), true],
  ['cmd+alt?+s', e(83, ['metaKey', 'altKey']), true],

  ['Cmd+Alt?+S', e('s', ['metaKey']), true],
  ['Cmd+Alt?+S', e('s', ['metaKey', 'altKey']), true],
  ['Cmd+Alt?+S', e(83, ['metaKey']), true],
  ['Cmd+Alt?+S', e(83, ['metaKey', 'altKey']), true],

  ['cmd+s', e('s', ['metaKey', 'altKey']), false],
  ['Cmd+S', e('s', ['metaKey', 'altKey']), false],
  ['cmd+s', e(83, ['metaKey', 'altKey']), false],
  ['Cmd+S', e(83, ['metaKey', 'altKey']), false],

  ['cmd+s', e('s', ['metaKey']), true],
  ['Cmd+s', e('s', ['metaKey']), true],
  ['cmd+s', e(83, ['metaKey']), true],
  ['Cmd+s', e(83, ['metaKey']), true],

  ['mod+s', e('s', ['ctrlKey']), true],
  ['Mod+S', e('s', ['ctrlKey']), true],
  ['mod+s', e(83, ['ctrlKey']), true],
  ['Mod+S', e(83, ['ctrlKey']), true],

  ['meta+alt+s', e('s', ['metaKey', 'altKey']), true],
  ['Meta+Alt+S', e('s', ['metaKey', 'altKey']), true],
  ['meta+alt+s', e(83, ['metaKey', 'altKey']), true],
  ['Meta+Alt+S', e(83, ['metaKey', 'altKey']), true],

  ['?', e('?'), true],
  ['?', e('?', ['altKey']), false],

  ['a', e('a'), true],
  ['a', e('A'), true],
  ['A', e('a'), true],
  ['A', e('A'), true],
  ['a', e(65), true],
  ['A', e(65), true],

  ['a', e('a', ['ctrlKey']), false],
  ['A', e('a', ['ctrlKey']), false],
  ['a', e(65, ['ctrlKey']), false],
  ['A', e(65, ['ctrlKey']), false],

  ['shift', e('Shift', ['shiftKey']), true],
  ['Shift', e('Shift', ['shiftKey']), true],
  ['shift', e(16, ['shiftKey']), true],
  ['Shift', e(16, ['shiftKey']), true],

  ['meta+a', e('a', ['metaKey']), true],
  ['Meta+A', e('a', ['metaKey']), true],
  ['cmd+a', e(65, ['metaKey']), true],
  ['Cmd+A', e(65, ['metaKey']), true],

  ['enter', e('Enter'), true],
  ['Enter', e('Enter'), true],
  ['enter', e(13), true],
  ['Enter', e(13), true],
  ['enter', e('Enter', ['shiftKey']), false],
  ['Enter', e('Enter', ['shiftKey']), false],

  ['cmd+=', e(187, ['metaKey']), true],
  ['Cmd+=', e(187, ['metaKey']), true],
  ['cmd++', e('+', ['metaKey']), true],
  ['Cmd++', e('+', ['metaKey']), true],

  ['meta+alt+ß', e('ß', ['metaKey', 'altKey']), true],
  ['Meta+Alt+ß', e('ß', ['metaKey', 'altKey']), true],
] satisfies Array<TestCase>

test(isHotkey.name, () => {
  for (const testCase of testCases) {
    expect(isHotkey(testCase[0], testCase[1])).toBe(testCase[2])
  }

  expect(() =>
    isHotkey('ctrlalt+k', e('k', ['ctrlKey', 'altKey'])),
  ).toThrowError('Unknown modifier: "ctrlalt"')
})
