type AllowedModifiers = {
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
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
    (allowedModifiers.ctrlKey === event.ctrlKey ||
      allowedModifiers.ctrlKey === undefined) &&
    (allowedModifiers.metaKey === event.metaKey ||
      allowedModifiers.metaKey === undefined) &&
    (allowedModifiers.shiftKey === event.shiftKey ||
      allowedModifiers.shiftKey === undefined) &&
    (allowedModifiers.altKey === event.altKey ||
      allowedModifiers.altKey === undefined)
  )
}
