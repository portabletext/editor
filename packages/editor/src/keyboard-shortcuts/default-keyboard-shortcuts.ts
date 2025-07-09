import {
  bold,
  code,
  createKeyboardShortcut,
  italic,
  redo,
  underline,
  undo,
} from '@portabletext/keyboard-shortcuts'

export const defaultKeyboardShortcuts = {
  arrowDown: createKeyboardShortcut({
    default: [
      {
        key: 'ArrowDown',
        alt: false,
        ctrl: false,
        meta: false,
        shift: false,
      },
    ],
  }),
  arrowUp: createKeyboardShortcut({
    default: [
      {
        key: 'ArrowUp',
        alt: false,
        ctrl: false,
        meta: false,
        shift: false,
      },
    ],
  }),
  break: createKeyboardShortcut({
    default: [
      {
        key: 'Enter',
        shift: false,
      },
    ],
  }),
  lineBreak: createKeyboardShortcut({
    default: [
      {
        key: 'Enter',
        shift: true,
      },
    ],
  }),
  decorators: {
    strong: bold,
    em: italic,
    underline: underline,
    code: code,
  },
  history: {
    undo,
    redo,
  },
  tab: createKeyboardShortcut({
    default: [
      {
        key: 'Tab',
        alt: false,
        ctrl: false,
        meta: false,
        shift: false,
      },
    ],
  }),
  shiftTab: createKeyboardShortcut({
    default: [
      {
        key: 'Tab',
        alt: false,
        ctrl: false,
        meta: false,
        shift: true,
      },
    ],
  }),
}
