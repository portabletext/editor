import {IS_APPLE} from './is-apple'
import {isKeyboardShortcut} from './is-keyboard-shortcut'
import type {KeyboardEventDefinition} from './keyboard-event-definition'

/**
 * @beta
 * Definition of a keyboard shortcut with platform-specific keyboard event
 * definitions.
 *
 * `default` keyboard event definitions are required while the `apple`
 * keyboard event definitions are optional.
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
  default: ReadonlyArray<KeyboardEventDefinition>
  apple?: ReadonlyArray<KeyboardEventDefinition>
}

/**
 * @beta
 * A resolved keyboard shortcut for the current platform that has been
 * processed by `createKeyboardShortcut(...)` to select the appropriate
 * platform-specific key combination. The `guard` function determines if the
 * shortcut applies to the current `KeyboardEvent`, while `keys` contains the
 * display-friendly key combination for the current platform.
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
  guard: (event: TKeyboardEvent) => boolean
  keys: ReadonlyArray<string>
}

/**
 * @beta
 * Creates a `KeyboardShortcut` from a `KeyboardShortcutDefinition`.
 *
 * `default` keyboard event definitions are required while the `apple`
 * keyboard event definitions are optional.
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
>(definition: KeyboardShortcutDefinition): KeyboardShortcut<TKeyboardEvent> {
  if (IS_APPLE) {
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
