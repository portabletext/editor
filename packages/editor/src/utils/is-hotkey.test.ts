import {expect, test} from 'vitest'
import {isHotkey, type KeyboardEventLike} from './is-hotkey'

function e(value: string | number, ...modifiers: string[]) {
  return {
    ...(typeof value === 'string' ? {key: value} : {keyCode: value}),
    altKey: modifiers.includes('alt'),
    ctrlKey: modifiers.includes('ctrl'),
    metaKey: modifiers.includes('meta'),
    shiftKey: modifiers.includes('shift'),
  } as KeyboardEventLike
}

type TestCase = [KeyboardEventLike, string, boolean]

const testCases = [
  [e(83, 'meta'), 'Meta+S', true],
  [e(83, 'alt', 'meta'), 'Meta+Alt+s', true],
  [e(83, 'meta'), 'meta+s', true],
  [e(83, 'meta'), 'cmd+s', true],
  [e(32, 'meta'), 'cmd+space', true],
  [e(187, 'meta'), 'cmd+=', true],
  [e(83, 'ctrl'), 'mod+s', true],
  [e(16, 'shift'), 'shift', true],
  [e(93, 'meta'), 'meta', true],
  [e(65), 'a', true],
  [e(83, 'alt', 'meta'), 'cmd+s', false],
  [e('a', 'ctrl'), 'a', false],
  [e(83, 'alt', 'meta'), 'cmd+alt?+s', true],
  [e(83, 'meta'), 'cmd+alt?+s', true],
  [e('?'), '?', true],
  [e(13), 'enter', true],
  [e(65, 'meta'), 'cmd+a', true],
  [e(83, 'meta'), 'cmd+s', true],
  [e('s', 'meta'), 'Meta+S', true],
  [e('ß', 'alt', 'meta'), 'Meta+Alt+ß', true],
  [e('s', 'meta'), 'meta+s', true],
  [e('s', 'meta'), 'cmd+s', true],
  [e(' ', 'meta'), 'cmd+space', true],
  [e('+', 'meta'), 'cmd++', true],
  [e('s', 'ctrl'), 'mod+s', true],
  [e('Shift', 'shift'), 'shift', true],
  [e('a'), 'a', true],
  [e('s', 'alt', 'meta'), 'cmd+s', false],
  [e('a', 'ctrl'), 'a', false],
  [e('s', 'alt', 'meta'), 'cmd+alt?+s', true],
  [e('s', 'meta'), 'cmd+alt?+s', true],
  [e('Enter'), 'enter', true],
  [e('a', 'meta'), 'meta+a', true],
  [e('s', 'meta'), 'meta+s', true],
] satisfies Array<TestCase>

test(isHotkey.name, () => {
  for (const testCase of testCases) {
    expect(isHotkey(testCase[1], testCase[0])).toBe(testCase[2])
  }

  expect(() => isHotkey('ctrlalt+k', e('k', 'ctrl', 'alt'))).toThrowError(
    'Unknown modifier: "ctrlalt"',
  )
})
