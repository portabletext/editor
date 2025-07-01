import {describe, expect, test} from 'vitest'
import {createKeyboardShortcut} from './keyboard-shortcuts'

describe(createKeyboardShortcut.name, () => {
  test('No Apple definition on a non-Apple platform', () => {
    const shortcut = createKeyboardShortcut(
      {
        default: {
          key: 'B',
          alt: false,
          ctrl: true,
          meta: false,
          shift: false,
        },
      },
      {
        isApple: false,
      },
    )

    expect(shortcut.keys).toEqual(['Ctrl', 'B'])
    expect(
      shortcut.guard({
        key: 'B',
        altKey: false,
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
      }),
    ).toBe(true)
    expect(
      shortcut.guard({
        key: 'B',
        altKey: false,
        ctrlKey: false,
        metaKey: true,
        shiftKey: false,
      }),
    ).toBe(false)
  })

  test('No Apple definition on an Apple platform', () => {
    const shortcut = createKeyboardShortcut(
      {
        default: {
          key: 'B',
          alt: false,
          ctrl: true,
          meta: false,
          shift: false,
        },
      },
      {
        isApple: true,
      },
    )

    expect(shortcut.keys).toEqual(['Ctrl', 'B'])
    expect(
      shortcut.guard({
        key: 'B',
        altKey: false,
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
      }),
    ).toBe(true)
    expect(
      shortcut.guard({
        key: 'B',
        altKey: false,
        ctrlKey: false,
        metaKey: true,
        shiftKey: false,
      }),
    ).toBe(false)
  })

  test('Apple definition on an Apple platform', () => {
    const shortcut = createKeyboardShortcut(
      {
        default: {
          key: 'B',
          alt: false,
          ctrl: true,
          meta: false,
          shift: false,
        },
        apple: {
          key: 'B',
          alt: false,
          ctrl: false,
          meta: true,
          shift: false,
        },
      },
      {
        isApple: true,
      },
    )

    expect(shortcut.keys).toEqual(['⌘', 'B'])
    expect(
      shortcut.guard({
        key: 'B',
        altKey: false,
        ctrlKey: false,
        metaKey: true,
        shiftKey: false,
      }),
    ).toBe(true)
    expect(
      shortcut.guard({
        key: 'B',
        altKey: false,
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
      }),
    ).toBe(false)
  })

  test('Apple definition on a non-Apple platform', () => {
    const shortcut = createKeyboardShortcut(
      {
        default: {
          key: 'B',
          alt: false,
          ctrl: true,
          meta: false,
          shift: false,
        },
        apple: {
          key: 'B',
          alt: false,
          ctrl: false,
          meta: true,
          shift: false,
        },
      },
      {
        isApple: false,
      },
    )

    expect(shortcut.keys).toEqual(['Ctrl', 'B'])
    expect(
      shortcut.guard({
        key: 'B',
        altKey: false,
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
      }),
    ).toBe(true)
    expect(
      shortcut.guard({
        key: 'B',
        altKey: false,
        ctrlKey: false,
        metaKey: true,
        shiftKey: false,
      }),
    ).toBe(false)
  })
})
