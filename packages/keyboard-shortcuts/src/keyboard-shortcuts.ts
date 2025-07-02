import {isKeyboardShortcut} from './is-keyboard-shortcut'

/**
 * @beta
 * Definition of an editor keyboard shortcut with platform-specific key mappings.
 *
 * The `key` represents a https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
 * and is treated as case-insensitive.
 *
 * @example
 * ```typescript
 * const boldShortcut: KeyboardShortcutDefinition = {
 *   default: {
 *     key: 'B',
 *     alt: false,
 *     ctrl: true,
 *     meta: false,
 *     shift: false,
 *   },
 *   apple: {
 *     key: 'B',
 *     alt: false,
 *     ctrl: false,
 *     meta: true,
 *     shift: false,
 *   },
 * }
 * ```
 */
export type KeyboardShortcutDefinition = {
  /**
   * Default shortcut for non-Apple platforms (Windows, Linux).
   */
  default: {
    key: KeyboardEvent['key']
    alt?: KeyboardEvent['altKey']
    ctrl?: KeyboardEvent['ctrlKey']
    meta?: KeyboardEvent['metaKey']
    shift?: KeyboardEvent['shiftKey']
  }
  /**
   * Shortcut for Apple platforms (macOS).
   */
  apple?: {
    key: KeyboardEvent['key']
    alt?: KeyboardEvent['altKey']
    ctrl?: KeyboardEvent['ctrlKey']
    meta?: KeyboardEvent['metaKey']
    shift?: KeyboardEvent['shiftKey']
  }
}

/**
 * @beta
 * A resolved keyboard shortcut for the current platform.
 *
 * This type represents a shortcut that has been processed by `createKeyboardShortcut()`
 * to select the appropriate platform-specific key combination. The `guard` function
 * determines if the shortcut applies to the current `KeyboardEvent`, while `keys`
 * contains the display-friendly key combination for the current platform.
 */
export type KeyboardShortcut<
  TKeyboardEvent extends Pick<
    KeyboardEvent,
    'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
  > = Pick<
    KeyboardEvent,
    'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
  >,
> = {
  /**
   * Function that determines if the shortcut should be triggered for a given
   * keyboard event.
   */
  guard: (event: TKeyboardEvent) => boolean
  /**
   * Platform-specific key combination for display purposes (resolved for the
   * current platform).
   */
  keys: ReadonlyArray<string>
}

const IS_APPLE =
  typeof window !== 'undefined' &&
  /Mac|iPod|iPhone|iPad/.test(window.navigator.userAgent)

/**
 * @beta
 * Utility function for creating a `KeyboardShortcut` from a
 * `KeyboardShortcutDefinition`.
 *
 * @example
 * ```typescript
 * const shortcut = createKeyboardShortcut({
 *   default: {
 *     key: 'B',
 *     alt: false,
 *     ctrl: true,
 *     meta: false,
 *     shift: false,
 *   },
 *   apple: {
 *     key: 'B',
 *     alt: false,
 *     ctrl: false,
 *     meta: true,
 *     shift: false,
 *   },
 * })
 * ```
 */
export function createKeyboardShortcut<
  TKeyboardEvent extends Pick<
    KeyboardEvent,
    'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
  > = Pick<
    KeyboardEvent,
    'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
  >,
>(
  definition: KeyboardShortcutDefinition,
  options?: {
    isApple?: boolean
  },
): KeyboardShortcut<TKeyboardEvent> {
  if (options?.isApple ?? IS_APPLE) {
    const appleDefinition = definition.apple ?? definition.default

    return {
      guard: (event) =>
        isKeyboardShortcut(event, appleDefinition.key, {
          alt: appleDefinition.alt,
          ctrl: appleDefinition.ctrl,
          meta: appleDefinition.meta,
          shift: appleDefinition.shift,
        }),
      keys: [
        ...(appleDefinition.meta ? ['⌘'] : []),
        ...(appleDefinition.ctrl ? ['Ctrl'] : []),
        ...(appleDefinition.alt ? ['Opt'] : []),
        ...(appleDefinition.shift ? ['Shift'] : []),
        appleDefinition.key,
      ],
    }
  }

  return {
    guard: (event) =>
      isKeyboardShortcut(event, definition.default.key, {
        alt: definition.default.alt,
        ctrl: definition.default.ctrl,
        meta: definition.default.meta,
        shift: definition.default.shift,
      }),
    keys: [
      ...(definition.default.meta ? ['Meta'] : []),
      ...(definition.default.ctrl ? ['Ctrl'] : []),
      ...(definition.default.alt ? ['Alt'] : []),
      ...(definition.default.shift ? ['Shift'] : []),
      definition.default.key,
    ],
  }
}
