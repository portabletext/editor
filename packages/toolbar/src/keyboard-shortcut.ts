export type KeyboardEventGuard<
  TKeyboardEvent extends Pick<
    KeyboardEvent,
    'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
  > = Pick<
    KeyboardEvent,
    'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
  >,
> = (event: TKeyboardEvent) => boolean

export type KeyboardShortcutDefinition<
  TKeyboardEvent extends Pick<
    KeyboardEvent,
    'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
  > = Pick<
    KeyboardEvent,
    'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
  >,
> = {
  default: {
    guard: KeyboardEventGuard<TKeyboardEvent>
    keys: ReadonlyArray<string>
  }
  apple?: {
    guard: KeyboardEventGuard<TKeyboardEvent>
    keys: ReadonlyArray<string>
  }
}

/**
 * @beta
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
  guard: KeyboardEventGuard<TKeyboardEvent>
  keys: ReadonlyArray<string>
}

/**
 * @beta
 */
export const IS_APPLE =
  typeof window !== 'undefined' &&
  /Mac|iPod|iPhone|iPad/.test(window.navigator.userAgent)

/**
 * @beta
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
