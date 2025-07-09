import {createKeyboardShortcut} from './keyboard-shortcuts'

/**
 * @beta
 */
export const bold = createKeyboardShortcut({
  default: [
    {
      key: 'B',
      alt: false,
      ctrl: true,
      meta: false,
      shift: false,
    },
  ],
  apple: [
    {
      key: 'B',
      alt: false,
      ctrl: false,
      meta: true,
      shift: false,
    },
  ],
})

/**
 * @beta
 */
export const italic = createKeyboardShortcut({
  default: [
    {
      key: 'I',
      alt: false,
      ctrl: true,
      meta: false,
      shift: false,
    },
  ],
  apple: [
    {
      key: 'I',
      alt: false,
      ctrl: false,
      meta: true,
      shift: false,
    },
  ],
})

/**
 * @beta
 */
export const code = createKeyboardShortcut({
  default: [
    {
      key: "'",
      alt: false,
      ctrl: true,
      meta: false,
      shift: false,
    },
  ],
  apple: [
    {
      key: "'",
      alt: false,
      ctrl: false,
      meta: true,
      shift: false,
    },
  ],
})

/**
 * @beta
 */
export const underline = createKeyboardShortcut({
  default: [
    {
      key: 'U',
      alt: false,
      ctrl: true,
      meta: false,
      shift: false,
    },
  ],
  apple: [
    {
      key: 'U',
      alt: false,
      ctrl: false,
      meta: true,
      shift: false,
    },
  ],
})

/**
 * @beta
 */
export const strikeThrough = createKeyboardShortcut({
  default: [
    {
      key: 'X',
      alt: false,
      ctrl: true,
      meta: false,
      shift: true,
    },
  ],
  apple: [
    {
      key: 'X',
      alt: false,
      ctrl: false,
      meta: true,
      shift: true,
    },
  ],
})

/**
 * @beta
 */
export const link = createKeyboardShortcut({
  default: [
    {
      key: 'K',
      alt: false,
      ctrl: true,
      meta: false,
      shift: false,
    },
  ],
  apple: [
    {
      key: 'K',
      alt: false,
      ctrl: false,
      meta: true,
      shift: false,
    },
  ],
})

/**
 * @beta
 */
export const normal = createKeyboardShortcut({
  default: [
    {
      key: '0',
      code: 'Digit0',
      alt: true,
      ctrl: true,
      meta: false,
      shift: false,
    },
    {
      key: '0',
      code: 'Numpad0',
      alt: true,
      ctrl: true,
      meta: false,
      shift: false,
    },
  ],
  apple: [
    {
      key: '0',
      code: 'Digit0',
      alt: true,
      ctrl: false,
      meta: true,
      shift: false,
    },
    {
      key: '0',
      code: 'Numpad0',
      alt: true,
      ctrl: false,
      meta: true,
      shift: false,
    },
  ],
})

/**
 * @beta
 */
export const h1 = createKeyboardShortcut({
  default: [
    {
      key: '1',
      code: 'Digit1',
      alt: true,
      ctrl: true,
      meta: false,
      shift: false,
    },
    {
      key: '1',
      code: 'Numpad1',
      alt: true,
      ctrl: true,
      meta: false,
      shift: false,
    },
  ],
  apple: [
    {
      key: '1',
      code: 'Digit1',
      alt: true,
      ctrl: false,
      meta: true,
      shift: false,
    },
    {
      key: '1',
      code: 'Numpad1',
      alt: true,
      ctrl: false,
      meta: true,
      shift: false,
    },
  ],
})

/**
 * @beta
 */
export const h2 = createKeyboardShortcut({
  default: [
    {
      key: '2',
      code: 'Digit2',
      alt: true,
      ctrl: true,
      meta: false,
      shift: false,
    },
    {
      key: '2',
      code: 'Numpad2',
      alt: true,
      ctrl: true,
      meta: false,
      shift: false,
    },
  ],
  apple: [
    {
      key: '2',
      code: 'Digit2',
      alt: true,
      ctrl: false,
      meta: true,
      shift: false,
    },
    {
      key: '2',
      code: 'Numpad2',
      alt: true,
      ctrl: false,
      meta: true,
      shift: false,
    },
  ],
})

/**
 * @beta
 */
export const h3 = createKeyboardShortcut({
  default: [
    {
      key: '3',
      code: 'Digit3',
      alt: true,
      ctrl: true,
      meta: false,
      shift: false,
    },
    {
      key: '3',
      code: 'Numpad3',
      alt: true,
      ctrl: true,
      meta: false,
      shift: false,
    },
  ],
  apple: [
    {
      key: '3',
      code: 'Digit3',
      alt: true,
      ctrl: false,
      meta: true,
      shift: false,
    },
    {
      key: '3',
      code: 'Numpad3',
      alt: true,
      ctrl: false,
      meta: true,
      shift: false,
    },
  ],
})

/**
 * @beta
 */
export const h4 = createKeyboardShortcut({
  default: [
    {
      key: '4',
      code: 'Digit4',
      alt: true,
      ctrl: true,
      meta: false,
      shift: false,
    },
    {
      key: '4',
      code: 'Numpad4',
      alt: true,
      ctrl: true,
      meta: false,
      shift: false,
    },
  ],
  apple: [
    {
      key: '4',
      code: 'Digit4',
      alt: true,
      ctrl: false,
      meta: true,
      shift: false,
    },
    {
      key: '4',
      code: 'Numpad4',
      alt: true,
      ctrl: false,
      meta: true,
      shift: false,
    },
  ],
})

/**
 * @beta
 */
export const h5 = createKeyboardShortcut({
  default: [
    {
      key: '5',
      code: 'Digit5',
      alt: true,
      ctrl: true,
      meta: false,
      shift: false,
    },
    {
      key: '5',
      code: 'Numpad5',
      alt: true,
      ctrl: true,
      meta: false,
      shift: false,
    },
  ],
  apple: [
    {
      key: '5',
      code: 'Digit5',
      alt: true,
      ctrl: false,
      meta: true,
      shift: false,
    },
    {
      key: '5',
      code: 'Numpad5',
      alt: true,
      ctrl: false,
      meta: true,
      shift: false,
    },
  ],
})

/**
 * @beta
 */
export const h6 = createKeyboardShortcut({
  default: [
    {
      key: '6',
      code: 'Digit6',
      alt: true,
      ctrl: true,
      meta: false,
      shift: false,
    },
    {
      key: '6',
      code: 'Numpad6',
      alt: true,
      ctrl: true,
      meta: false,
      shift: false,
    },
  ],
  apple: [
    {
      key: '6',
      code: 'Digit6',
      alt: true,
      ctrl: false,
      meta: true,
      shift: false,
    },
    {
      key: '6',
      code: 'Numpad6',
      alt: true,
      ctrl: false,
      meta: true,
      shift: false,
    },
  ],
})

/**
 * @beta
 */
export const blockquote = createKeyboardShortcut({
  default: [
    {
      key: 'Q',
      alt: false,
      ctrl: true,
      meta: false,
      shift: true,
    },
  ],
})

/**
 * @beta
 */
export const undo = createKeyboardShortcut({
  default: [
    {
      key: 'Z',
      alt: false,
      ctrl: true,
      meta: false,
      shift: false,
    },
  ],
  apple: [
    {
      key: 'Z',
      alt: false,
      ctrl: false,
      meta: true,
      shift: false,
    },
  ],
})

/**
 * @beta
 */
export const redo = createKeyboardShortcut({
  default: [
    {
      key: 'Y',
      alt: false,
      ctrl: true,
      meta: false,
      shift: false,
    },
    {
      key: 'Z',
      alt: false,
      ctrl: true,
      meta: false,
      shift: true,
    },
  ],
  apple: [
    {
      key: 'Z',
      alt: false,
      ctrl: false,
      meta: true,
      shift: true,
    },
  ],
})
