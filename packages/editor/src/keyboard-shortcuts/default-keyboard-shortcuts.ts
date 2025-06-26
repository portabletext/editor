import {isKeyboardShortcut} from './is-keyboard-shortcut'
import {createKeyboardShortcut} from './keyboard-shortcuts'

export const defaultKeyboardShortcuts = {
  arrowDown: createKeyboardShortcut({
    default: {
      guard: (event) =>
        isKeyboardShortcut(event, 'ArrowDown', {
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
          altKey: false,
        }),
      keys: ['ArrowDown'],
    },
  }),
  arrowUp: createKeyboardShortcut({
    default: {
      guard: (event) =>
        isKeyboardShortcut(event, 'ArrowUp', {
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
          altKey: false,
        }),
      keys: ['ArrowUp'],
    },
  }),
  break: createKeyboardShortcut({
    default: {
      guard: (event) => isKeyboardShortcut(event, 'Enter', {shiftKey: false}),
      keys: ['Enter'],
    },
  }),
  lineBreak: createKeyboardShortcut({
    default: {
      guard: (event) => isKeyboardShortcut(event, 'Enter', {shiftKey: true}),
      keys: ['Shift', 'Enter'],
    },
  }),
  decorators: {
    strong: createKeyboardShortcut({
      default: {
        guard: (event) =>
          isKeyboardShortcut(event, 'b', {
            altKey: false,
            ctrlKey: true,
            metaKey: false,
            shiftKey: false,
          }),
        keys: ['Ctrl', 'B'],
      },
      apple: {
        guard: (event) =>
          isKeyboardShortcut(event, 'b', {
            altKey: false,
            ctrlKey: false,
            metaKey: true,
            shiftKey: false,
          }),
        keys: ['⌘', 'B'],
      },
    }),
    em: createKeyboardShortcut({
      default: {
        guard: (event) =>
          isKeyboardShortcut(event, 'i', {
            altKey: false,
            ctrlKey: true,
            metaKey: false,
            shiftKey: false,
          }),
        keys: ['Ctrl', 'I'],
      },
      apple: {
        guard: (event) =>
          isKeyboardShortcut(event, 'i', {
            altKey: false,
            ctrlKey: false,
            metaKey: true,
            shiftKey: false,
          }),
        keys: ['⌘', 'I'],
      },
    }),
    underline: createKeyboardShortcut({
      default: {
        guard: (event) =>
          isKeyboardShortcut(event, 'u', {
            altKey: false,
            ctrlKey: true,
            metaKey: false,
            shiftKey: false,
          }),
        keys: ['Ctrl', 'U'],
      },
      apple: {
        guard: (event) =>
          isKeyboardShortcut(event, 'u', {
            altKey: false,
            ctrlKey: false,
            metaKey: true,
            shiftKey: false,
          }),
        keys: ['⌘', 'U'],
      },
    }),
    code: createKeyboardShortcut({
      default: {
        guard: (event) =>
          isKeyboardShortcut(event, "'", {
            altKey: false,
            ctrlKey: true,
            metaKey: false,
            shiftKey: false,
          }),
        keys: ['Ctrl', "'"],
      },
      apple: {
        guard: (event) =>
          isKeyboardShortcut(event, "'", {
            altKey: false,
            ctrlKey: false,
            metaKey: true,
            shiftKey: false,
          }),
        keys: ['⌘', "'"],
      },
    }),
  },
  history: {
    undo: createKeyboardShortcut({
      default: {
        guard: (event) =>
          isKeyboardShortcut(event, 'z', {
            altKey: false,
            ctrlKey: true,
            metaKey: false,
            shiftKey: false,
          }),
        keys: ['Ctrl', 'Z'],
      },
      apple: {
        guard: (event) =>
          isKeyboardShortcut(event, 'z', {
            altKey: false,
            ctrlKey: false,
            metaKey: true,
            shiftKey: false,
          }),
        keys: ['⌘', 'Z'],
      },
    }),
    redo: createKeyboardShortcut({
      default: {
        guard: (event) =>
          isKeyboardShortcut(event, 'y', {
            ctrlKey: true,
            metaKey: false,
            shiftKey: false,
            altKey: false,
          }) ||
          isKeyboardShortcut(event, 'z', {
            ctrlKey: true,
            metaKey: false,
            shiftKey: true,
            altKey: false,
          }),
        keys: ['Ctrl', 'Y'],
      },
      apple: {
        guard: (event) =>
          isKeyboardShortcut(event, 'z', {
            ctrlKey: false,
            metaKey: true,
            shiftKey: true,
            altKey: false,
          }),
        keys: ['⌘', 'Shift', 'Z'],
      },
    }),
  },
  tab: createKeyboardShortcut({
    default: {
      guard: (event) =>
        isKeyboardShortcut(event, 'Tab', {
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
          altKey: false,
        }),
      keys: ['Tab'],
    },
  }),
  shiftTab: createKeyboardShortcut({
    default: {
      guard: (event) =>
        isKeyboardShortcut(event, 'Tab', {
          ctrlKey: false,
          metaKey: false,
          shiftKey: true,
          altKey: false,
        }),
      keys: ['Shift', 'Tab'],
    },
  }),
}
