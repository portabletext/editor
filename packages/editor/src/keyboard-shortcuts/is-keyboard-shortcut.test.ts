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
      {shiftKey: false},
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
      {shiftKey: false},
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
      {shiftKey: true},
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
      {ctrlKey: true, metaKey: false},
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
      {ctrlKey: false, metaKey: true},
    ),
  ).toBe(false)
})
