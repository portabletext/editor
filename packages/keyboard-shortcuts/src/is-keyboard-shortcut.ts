export type KeyboardEventDefinition = (
  | {key: KeyboardEvent['key']; code: KeyboardEvent['code']}
  | {key: KeyboardEvent['key']; code?: undefined}
  | {key?: undefined; code: KeyboardEvent['code']}
) & {
  alt?: KeyboardEvent['altKey']
  ctrl?: KeyboardEvent['ctrlKey']
  meta?: KeyboardEvent['metaKey']
  shift?: KeyboardEvent['shiftKey']
}

/**
 * Checks if a keyboard event matches a keyboard shortcut definition.
 */
export function isKeyboardShortcut<
  TKeyboardEvent extends Pick<
    KeyboardEvent,
    'key' | 'code' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'
  > = Pick<
    KeyboardEvent,
    'key' | 'code' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'
  >,
>(definition: KeyboardEventDefinition, event: TKeyboardEvent) {
  if (!isCorrectModifiers(definition, event)) {
    return false
  }

  if (
    definition.code !== undefined &&
    definition.code.toLowerCase() === event.code.toLowerCase()
  ) {
    return true
  }

  return (
    definition.key !== undefined &&
    definition.key.toLowerCase() === event.key.toLowerCase()
  )
}

function isCorrectModifiers<
  TKeyboardEvent extends Pick<
    KeyboardEvent,
    'key' | 'code' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'
  > = Pick<
    KeyboardEvent,
    'key' | 'code' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'
  >,
>(definition: KeyboardEventDefinition, event: TKeyboardEvent) {
  return (
    (definition.ctrl === event.ctrlKey || definition.ctrl === undefined) &&
    (definition.meta === event.metaKey || definition.meta === undefined) &&
    (definition.shift === event.shiftKey || definition.shift === undefined) &&
    (definition.alt === event.altKey || definition.alt === undefined)
  )
}
