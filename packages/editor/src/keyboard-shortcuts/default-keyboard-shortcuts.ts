import {createKeyboardShortcut} from '@portabletext/keyboard-shortcuts'

export const defaultKeyboardShortcuts = {
  arrowDown: createKeyboardShortcut({
    default: {
      key: 'ArrowDown',
      alt: false,
      ctrl: false,
      meta: false,
      shift: false,
    },
  }),
  arrowUp: createKeyboardShortcut({
    default: {
      key: 'ArrowUp',
      alt: false,
      ctrl: false,
      meta: false,
      shift: false,
    },
  }),
  break: createKeyboardShortcut({
    default: {
      key: 'Enter',
      shift: false,
    },
  }),
  lineBreak: createKeyboardShortcut({
    default: {
      key: 'Enter',
      shift: true,
    },
  }),
  decorators: {
    strong: createKeyboardShortcut({
      default: {
        key: 'B',
        alt: false,
        ctrl: true,
        meta: false,
        shift: false,
      },
      apple: {
        key: 'B',
        alt: false,
        ctrl: false,
        meta: true,
        shift: false,
      },
    }),
    em: createKeyboardShortcut({
      default: {
        key: 'I',
        alt: false,
        ctrl: true,
        meta: false,
        shift: false,
      },
      apple: {
        key: 'I',
        alt: false,
        ctrl: false,
        meta: true,
        shift: false,
      },
    }),
    underline: createKeyboardShortcut({
      default: {
        key: 'U',
        alt: false,
        ctrl: true,
        meta: false,
        shift: false,
      },
      apple: {
        key: 'U',
        alt: false,
        ctrl: false,
        meta: true,
        shift: false,
      },
    }),
    code: createKeyboardShortcut({
      default: {
        key: "'",
        alt: false,
        ctrl: true,
        meta: false,
        shift: false,
      },
      apple: {
        key: "'",
        alt: false,
        ctrl: false,
        meta: true,
        shift: false,
      },
    }),
  },
  history: {
    undo: createKeyboardShortcut({
      default: {
        key: 'Z',
        alt: false,
        ctrl: true,
        meta: false,
        shift: false,
      },
      apple: {
        key: 'Z',
        alt: false,
        ctrl: false,
        meta: true,
        shift: false,
      },
    }),
    redo: createKeyboardShortcut({
      default: {
        key: 'Y',
        alt: false,
        ctrl: true,
        meta: false,
        shift: false,
      },
      apple: {
        key: 'Z',
        alt: false,
        ctrl: false,
        meta: true,
        shift: true,
      },
    }),
    redoAlternative: createKeyboardShortcut({
      default: {
        key: 'Z',
        alt: false,
        ctrl: true,
        meta: false,
        shift: true,
      },
      apple: {
        key: 'Z',
        alt: false,
        ctrl: false,
        meta: true,
        shift: true,
      },
    }),
  },
  tab: createKeyboardShortcut({
    default: {
      key: 'Tab',
      alt: false,
      ctrl: false,
      meta: false,
      shift: false,
    },
  }),
  shiftTab: createKeyboardShortcut({
    default: {
      key: 'Tab',
      alt: false,
      ctrl: false,
      meta: false,
      shift: true,
    },
  }),
}
