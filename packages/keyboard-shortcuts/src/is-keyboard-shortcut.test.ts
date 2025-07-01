import {expect, test} from 'vitest'
import {isKeyboardShortcut} from './is-keyboard-shortcut'

test(isKeyboardShortcut.name, () => {
  expect(
    isKeyboardShortcut(
      {
        key: 'Enter',
        code: 'Enter',
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
      },
      'Enter',
      {shift: false},
    ),
  ).toBe(true)

  expect(
    isKeyboardShortcut(
      {
        key: 'Enter',
        code: 'Enter',
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: true,
      },
      'Enter',
      {shift: false},
    ),
  ).toBe(false)

  expect(
    isKeyboardShortcut(
      {
        key: 'Enter',
        code: 'Enter',
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: true,
      },
      'Enter',
      {shift: true},
    ),
  ).toBe(true)

  expect(
    isKeyboardShortcut(
      {
        key: 'Enter',
        code: 'Enter',
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: true,
      },
      'Enter',
    ),
  ).toBe(true)

  expect(
    isKeyboardShortcut(
      {
        key: 'b',
        code: 'KeyB',
        metaKey: false,
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
      },
      'B',
      {ctrl: true, meta: false},
    ),
  ).toBe(true)

  expect(
    isKeyboardShortcut(
      {
        key: 'b',
        code: 'KeyB',
        metaKey: false,
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
      },
      'B',
      {ctrl: false, meta: true},
    ),
  ).toBe(false)
})
