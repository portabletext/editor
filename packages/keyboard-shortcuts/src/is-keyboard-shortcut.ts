type AllowedModifiers = {
  ctrl?: boolean | undefined
  meta?: boolean | undefined
  shift?: boolean | undefined
  alt?: boolean | undefined
}

export function isKeyboardShortcut<
  TKeyboardEvent extends Pick<
    KeyboardEvent,
    'key' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'
  > = Pick<
    KeyboardEvent,
    'key' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'
  >,
>(event: TKeyboardEvent, key: string, allowedModifiers: AllowedModifiers = {}) {
  return (
    event.key.toLowerCase() === key.toLowerCase() &&
    (allowedModifiers.ctrl === event.ctrlKey ||
      allowedModifiers.ctrl === undefined) &&
    (allowedModifiers.meta === event.metaKey ||
      allowedModifiers.meta === undefined) &&
    (allowedModifiers.shift === event.shiftKey ||
      allowedModifiers.shift === undefined) &&
    (allowedModifiers.alt === event.altKey ||
      allowedModifiers.alt === undefined)
  )
}
