import {describe, expect, test} from 'vitest'
import {isKeyboardShortcut} from './is-keyboard-shortcut'

describe(isKeyboardShortcut.name, () => {
  test('Enter with no shift matching Enter', () => {
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
  })

  test('Enter with no shift matching the same', () => {
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
  })

  test('Enter with required shift', () => {
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
  })

  test('Enter with optional modifiers', () => {
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
  })

  test('bold shortcut on a non-Apple platform', () => {
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
  })

  test('bold shortcut on an Apple platform', () => {
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
})
