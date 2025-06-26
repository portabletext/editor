export type KeyboardEventGuard<
  TKeyboardEvent extends Pick<
    KeyboardEvent,
    'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
  > = Pick<
    KeyboardEvent,
    'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
  >,
> = (event: TKeyboardEvent) => boolean

/**
 * @beta
 * Definition of an editor keyboard shortcut with platform-specific key mappings.
 *
 * @example
 * ```typescript
 * const boldShortcut: ShortcutDefinition = {
 *   default: {
 *     guard: (event) => isKeyboardShortcut(event, 'B', {ctrlKey: true, metaKey: false}),
 *     keys: ['Ctrl', 'B'],
 *   },
 *   apple: {
 *     guard: (event) => isKeyboardShortcut(event, 'B', {ctrlKey: false, metaKey: true}),
 *     keys: ['⌘', 'B'],
 *   },
 * }
 * ```
 */
export type KeyboardShortcutDefinition<
  TKeyboardEvent extends Pick<
    KeyboardEvent,
    'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
  > = Pick<
    KeyboardEvent,
    'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
  >,
> = {
  /**
   * Default shortcut for non-Apple platforms (Windows, Linux).
   */
  default: {
    guard: KeyboardEventGuard<TKeyboardEvent>
    keys: ReadonlyArray<string>
  }
  /**
   * Shortcut for Apple platforms (macOS).
   */
  apple?: {
    guard: KeyboardEventGuard<TKeyboardEvent>
    keys: ReadonlyArray<string>
  }
}

/**
 * @beta
 * A resolved keyboard shortcut for the current platform.
 *
 * This type represents a shortcut that has been processed by `createShortcut()`
 * to select the appropriate platform-specific key combination. The `guard` function
 * determines if the shortcut applies to the current `KeyboardEvent`, while `keys`
 * contains the display-friendly key combination for the current platform.
 *
 * @example
 * ```typescript
 * const shortcut = createShortcut({
 *   guard: (event) => isKeyboardShortcut(event, 'B', {ctrlKey: true, metaKey: false}),
 *   keys: {
 *     default: ['Ctrl', 'B'],
 *     apple: ['⌘', 'B'],
 *   },
 * })
 * // On macOS: shortcut.keys = ['⌘', 'B']
 * // On Windows: shortcut.keys = ['Ctrl', 'B']
 * ```
 */
export type KeyboardShortcut<
  TKeyboardEvent extends Pick<
    KeyboardEvent,
    'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
  > = Pick<
    KeyboardEvent,
    'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
  >,
> = {
  /**
   * Function that determines if the shortcut should be triggered for a given
   * keyboard event.
   */
  guard: KeyboardEventGuard<TKeyboardEvent>
  /**
   * Platform-specific key combination for display purposes (resolved for the
   * current platform).
   */
  keys: ReadonlyArray<string>
}

export const IS_APPLE =
  typeof window !== 'undefined' &&
  /Mac|iPod|iPhone|iPad/.test(window.navigator.userAgent)

/**
 * @beta
 * Utility function for creating a `KeyboardShortcut` from a
 * `KeyboardShortcutDefinition`.
 */
export function createKeyboardShortcut<
  TKeyboardEvent extends Pick<
    KeyboardEvent,
    'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
  > = Pick<
    KeyboardEvent,
    'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
  >,
>(
  definition: KeyboardShortcutDefinition<TKeyboardEvent>,
): KeyboardShortcut<TKeyboardEvent> {
  return IS_APPLE
    ? (definition.apple ?? definition.default)
    : definition.default
}
