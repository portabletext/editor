export interface KeyboardEventLike {
  key: string
  keyCode?: number
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
}

interface HotKey {
  keyCode?: number | undefined
  key?: string | undefined
  altKey: boolean | null
  ctrlKey: boolean | null
  metaKey: boolean | null
  shiftKey: boolean | null
}

export const IS_MAC =
  typeof window !== 'undefined' &&
  /Mac|iPod|iPhone|iPad/.test(window.navigator.userAgent)

type Modifier = 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'

const modifiers: Record<string, Modifier | undefined> = {
  alt: 'altKey',
  control: 'ctrlKey',
  meta: 'metaKey',
  shift: 'shiftKey',
}

const aliases: Record<string, string | undefined> = {
  add: '+',
  break: 'pause',
  cmd: 'meta',
  command: 'meta',
  ctl: 'control',
  ctrl: 'control',
  del: 'delete',
  down: 'arrowdown',
  esc: 'escape',
  ins: 'insert',
  left: 'arrowleft',
  mod: IS_MAC ? 'meta' : 'control',
  opt: 'alt',
  option: 'alt',
  return: 'enter',
  right: 'arrowright',
  space: ' ',
  spacebar: ' ',
  up: 'arrowup',
  win: 'meta',
  windows: 'meta',
}

const keyCodes: Record<string, number | undefined> = {
  'backspace': 8,
  'tab': 9,
  'enter': 13,
  'shift': 16,
  'control': 17,
  'alt': 18,
  'pause': 19,
  'capslock': 20,
  'escape': 27,
  ' ': 32,
  'pageup': 33,
  'pagedown': 34,
  'end': 35,
  'home': 36,
  'arrowleft': 37,
  'arrowup': 38,
  'arrowright': 39,
  'arrowdown': 40,
  'insert': 45,
  'delete': 46,
  'meta': 91,
  'numlock': 144,
  'scrolllock': 145,
  ';': 186,
  '=': 187,
  ',': 188,
  '-': 189,
  '.': 190,
  '/': 191,
  '`': 192,
  '[': 219,
  '\\': 220,
  ']': 221,
  "'": 222,
  'f1': 112,
  'f2': 113,
  'f3': 114,
  'f4': 115,
  'f5': 116,
  'f6': 117,
  'f7': 118,
  'f8': 119,
  'f9': 120,
  'f10': 121,
  'f11': 122,
  'f12': 123,
  'f13': 124,
  'f14': 125,
  'f15': 126,
  'f16': 127,
  'f17': 128,
  'f18': 129,
  'f19': 130,
  'f20': 131,
}

export function isHotkey(hotkey: string, event: KeyboardEventLike): boolean {
  return compareHotkey(parseHotkey(hotkey), event)
}

function parseHotkey(hotkey: string): HotKey {
  // Ensure that all the modifiers are set to false unless the hotkey has them.
  const parsedHotkey: HotKey = {
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
  }

  // Special case to handle the `+` key since we use it as a separator.
  const hotkeySegments = hotkey.replace('++', '+add').split('+')

  for (const rawHotkeySegment of hotkeySegments) {
    const optional =
      rawHotkeySegment.endsWith('?') && rawHotkeySegment.length > 1
    const hotkeySegment = optional
      ? rawHotkeySegment.slice(0, -1)
      : rawHotkeySegment
    const keyName = toKeyName(hotkeySegment)
    const modifier = modifiers[keyName]
    const alias = aliases[hotkeySegment]
    const code = keyCodes[keyName]

    if (
      hotkeySegment.length > 1 &&
      modifier === undefined &&
      alias === undefined &&
      code === undefined
    ) {
      throw new TypeError(`Unknown modifier: "${hotkeySegment}"`)
    }

    if (hotkeySegments.length === 1 || modifier === undefined) {
      parsedHotkey.key = keyName
      parsedHotkey.keyCode = toKeyCode(hotkeySegment)
    }

    if (modifier !== undefined) {
      parsedHotkey[modifier] = optional ? null : true
    }
  }

  return parsedHotkey
}

function compareHotkey(
  parsedHotkey: HotKey,
  event: KeyboardEventLike,
): boolean {
  const matchingModifiers =
    (parsedHotkey.altKey != null
      ? parsedHotkey.altKey === event.altKey
      : true) &&
    (parsedHotkey.ctrlKey != null
      ? parsedHotkey.ctrlKey === event.ctrlKey
      : true) &&
    (parsedHotkey.metaKey != null
      ? parsedHotkey.metaKey === event.metaKey
      : true) &&
    (parsedHotkey.shiftKey != null
      ? parsedHotkey.shiftKey === event.shiftKey
      : true)

  if (!matchingModifiers) {
    return false
  }

  if (parsedHotkey.keyCode !== undefined && event.keyCode !== undefined) {
    if (parsedHotkey.keyCode === 91 && event.keyCode === 93) {
      return true
    }

    return parsedHotkey.keyCode === event.keyCode
  }

  return (
    parsedHotkey.keyCode === event.keyCode ||
    parsedHotkey.key === event.key.toLowerCase()
  )
}

function toKeyCode(name: string): number {
  const keyName = toKeyName(name)
  const keyCode = keyCodes[keyName] ?? keyName.toUpperCase().charCodeAt(0)

  return keyCode
}

function toKeyName(name: string): string {
  const keyName = name.toLowerCase()

  return aliases[keyName] ?? keyName
}
