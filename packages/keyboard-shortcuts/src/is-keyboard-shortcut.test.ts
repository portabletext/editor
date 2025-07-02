import {expect, test} from 'vitest'
import {isKeyboardShortcut} from './is-keyboard-shortcut'

test(isKeyboardShortcut.name, () => {
  expect(
    isKeyboardShortcut(
      {
        key: 'Enter',
        shift: false,
      },
      {
        key: 'Enter',
        code: 'Enter',
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
      },
    ),
  ).toBe(true)

  expect(
    isKeyboardShortcut(
      {
        key: 'Enter',
        shift: false,
      },
      {
        key: 'Enter',
        code: 'Enter',
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: true,
      },
    ),
  ).toBe(false)

  expect(
    isKeyboardShortcut(
      {
        key: 'Enter',
        shift: true,
      },
      {
        key: 'Enter',
        code: 'Enter',
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: true,
      },
    ),
  ).toBe(true)

  expect(
    isKeyboardShortcut(
      {
        key: 'Enter',
      },
      {
        key: 'Enter',
        code: 'Enter',
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: true,
      },
    ),
  ).toBe(true)

  expect(
    isKeyboardShortcut(
      {
        key: 'B',
        ctrl: true,
        meta: false,
      },
      {
        key: 'b',
        code: 'KeyB',
        metaKey: false,
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
      },
    ),
  ).toBe(true)

  expect(
    isKeyboardShortcut(
      {
        key: 'B',
        ctrl: false,
        meta: true,
      },
      {
        key: 'b',
        code: 'KeyB',
        metaKey: false,
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
      },
    ),
  ).toBe(false)
})
