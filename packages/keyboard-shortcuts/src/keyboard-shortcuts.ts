import {
  isKeyboardShortcut,
  type KeyboardEventDefinition,
} from './is-keyboard-shortcut'

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
 *   default: [{
 *     key: 'B',
 *     alt: false,
 *     ctrl: true,
 *     meta: false,
 *     shift: false,
 *   }],
 *   apple: [{
 *     key: 'B',
 *     alt: false,
 *     ctrl: false,
 *     meta: true,
 *     shift: false,
 *   }],
 * }
 * ```
 */
export type KeyboardShortcutDefinition = {
  /**
   * Default shortcut for non-Apple platforms (Windows, Linux).
   */
  default: ReadonlyArray<KeyboardEventDefinition>
  /**
   * Shortcut for Apple platforms (macOS).
   */
  apple?: ReadonlyArray<KeyboardEventDefinition>
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
 *   default: [{
 *     key: 'B',
 *     alt: false,
 *     ctrl: true,
 *     meta: false,
 *     shift: false,
 *   }],
 *   apple: [{
 *     key: 'B',
 *     alt: false,
 *     ctrl: false,
 *     meta: true,
 *     shift: false,
 *   }],
 * })
 * ```
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
  definition: KeyboardShortcutDefinition,
  options?: {
    isApple?: boolean
  },
): KeyboardShortcut<TKeyboardEvent> {
  if (options?.isApple ?? IS_APPLE) {
    const appleDefinition = definition.apple ?? definition.default
    const firstDefinition = appleDefinition.at(0)

    return {
      guard: (event) =>
        appleDefinition.some((definition) =>
          isKeyboardShortcut(definition, event),
        ),
      keys: [
        ...(firstDefinition?.meta ? ['⌘'] : []),
        ...(firstDefinition?.ctrl ? ['Ctrl'] : []),
        ...(firstDefinition?.alt ? ['Option'] : []),
        ...(firstDefinition?.shift ? ['Shift'] : []),
        ...(firstDefinition?.key !== undefined
          ? [firstDefinition.key]
          : firstDefinition?.code !== undefined
            ? [firstDefinition.code]
            : []),
      ],
    }
  }

  const firstDefinition = definition.default.at(0)

  return {
    guard: (event) =>
      definition.default.some((definition) =>
        isKeyboardShortcut(definition, event),
      ),
    keys: [
      ...(firstDefinition?.meta ? ['Meta'] : []),
      ...(firstDefinition?.ctrl ? ['Ctrl'] : []),
      ...(firstDefinition?.alt ? ['Alt'] : []),
      ...(firstDefinition?.shift ? ['Shift'] : []),
      ...(firstDefinition?.key !== undefined
        ? [firstDefinition.key]
        : firstDefinition?.code !== undefined
          ? [firstDefinition.code]
          : []),
    ],
  }
}
