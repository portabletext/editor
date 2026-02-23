import {createKeyboardShortcut} from '@portabletext/keyboard-shortcuts'

// generic: mod+b
const bold = createKeyboardShortcut({
  default: [{key: 'B', ctrl: true, meta: false, alt: false, shift: false}],
  apple: [{key: 'B', ctrl: false, meta: true, alt: false, shift: false}],
})

// generic: down, left, right, up, backspace, enter
const compose = {
  guard: (event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    return (
      key === 'arrowdown' ||
      key === 'arrowleft' ||
      key === 'arrowright' ||
      key === 'arrowup' ||
      key === 'backspace' ||
      key === 'enter'
    )
  },
}

// generic: left
const moveBackward = createKeyboardShortcut({
  default: [{key: 'ArrowLeft'}],
})

// generic: right
const moveForward = createKeyboardShortcut({
  default: [{key: 'ArrowRight'}],
})

// generic: ctrl+left, apple: opt+left
const moveWordBackward = createKeyboardShortcut({
  default: [{key: 'ArrowLeft', ctrl: true}],
  apple: [
    {key: 'ArrowLeft', ctrl: true},
    {key: 'ArrowLeft', alt: true},
  ],
})

// generic: ctrl+right, apple: opt+right
const moveWordForward = createKeyboardShortcut({
  default: [{key: 'ArrowRight', ctrl: true}],
  apple: [
    {key: 'ArrowRight', ctrl: true},
    {key: 'ArrowRight', alt: true},
  ],
})

// generic: shift?+backspace, apple: ctrl+backspace, ctrl+h
const deleteBackward = createKeyboardShortcut({
  default: [
    {key: 'Backspace', ctrl: false, meta: false, alt: false},
    {key: 'Backspace', shift: true, ctrl: false, meta: false, alt: false},
  ],
  apple: [
    {key: 'Backspace', ctrl: false, meta: false, alt: false},
    {key: 'Backspace', shift: true, ctrl: false, meta: false, alt: false},
    {key: 'Backspace', ctrl: true},
    {key: 'h', ctrl: true},
  ],
})

// generic: shift?+delete, apple: ctrl+delete, ctrl+d
const deleteForward = createKeyboardShortcut({
  default: [
    {key: 'Delete', ctrl: false, meta: false, alt: false},
    {key: 'Delete', shift: true, ctrl: false, meta: false, alt: false},
  ],
  apple: [
    {key: 'Delete', ctrl: false, meta: false, alt: false},
    {key: 'Delete', shift: true, ctrl: false, meta: false, alt: false},
    {key: 'Delete', ctrl: true},
    {key: 'd', ctrl: true},
  ],
})

// generic: shift+left
const extendBackward = createKeyboardShortcut({
  default: [{key: 'ArrowLeft', shift: true}],
})

// generic: shift+right
const extendForward = createKeyboardShortcut({
  default: [{key: 'ArrowRight', shift: true}],
})

// generic: mod+i
const italic = createKeyboardShortcut({
  default: [{key: 'I', ctrl: true, meta: false, alt: false, shift: false}],
  apple: [{key: 'I', ctrl: false, meta: true, alt: false, shift: false}],
})

// generic: shift+enter
const insertSoftBreak = createKeyboardShortcut({
  default: [{key: 'Enter', shift: true}],
})

// generic: enter
const splitBlock = createKeyboardShortcut({
  default: [{key: 'Enter', shift: false, ctrl: false, meta: false, alt: false}],
})

// generic: mod+z
const undo = createKeyboardShortcut({
  default: [{key: 'Z', ctrl: true, meta: false, alt: false, shift: false}],
  apple: [{key: 'Z', ctrl: false, meta: true, alt: false, shift: false}],
})

// apple only: opt+up
const moveLineBackward = createKeyboardShortcut({
  default: [],
  apple: [{key: 'ArrowUp', alt: true}],
})

// apple only: opt+down
const moveLineForward = createKeyboardShortcut({
  default: [],
  apple: [{key: 'ArrowDown', alt: true}],
})

// apple only: cmd+shift?+backspace
const deleteLineBackward = createKeyboardShortcut({
  default: [],
  apple: [
    {key: 'Backspace', meta: true},
    {key: 'Backspace', meta: true, shift: true},
  ],
})

// apple only: cmd+shift?+delete, ctrl+k
const deleteLineForward = createKeyboardShortcut({
  default: [],
  apple: [
    {key: 'Delete', meta: true},
    {key: 'Delete', meta: true, shift: true},
    {key: 'k', ctrl: true},
  ],
})

// generic: (none), apple: opt+shift?+backspace, windows: ctrl+shift?+backspace
const deleteWordBackward = createKeyboardShortcut({
  default: [
    {key: 'Backspace', ctrl: true},
    {key: 'Backspace', ctrl: true, shift: true},
  ],
  apple: [
    {key: 'Backspace', alt: true},
    {key: 'Backspace', alt: true, shift: true},
  ],
})

// generic: (none), apple: opt+shift?+delete, windows: ctrl+shift?+delete
const deleteWordForward = createKeyboardShortcut({
  default: [
    {key: 'Delete', ctrl: true},
    {key: 'Delete', ctrl: true, shift: true},
  ],
  apple: [
    {key: 'Delete', alt: true},
    {key: 'Delete', alt: true, shift: true},
  ],
})

// apple only: opt+shift+up
const extendLineBackward = createKeyboardShortcut({
  default: [],
  apple: [{key: 'ArrowUp', alt: true, shift: true}],
})

// apple only: opt+shift+down
const extendLineForward = createKeyboardShortcut({
  default: [],
  apple: [{key: 'ArrowDown', alt: true, shift: true}],
})

// apple: cmd+shift+z, windows: ctrl+y, ctrl+shift+z
const redo = createKeyboardShortcut({
  default: [
    {key: 'Y', ctrl: true, meta: false, alt: false, shift: false},
    {key: 'Z', ctrl: true, meta: false, alt: false, shift: true},
  ],
  apple: [{key: 'Z', ctrl: false, meta: true, alt: false, shift: true}],
})

// apple only: ctrl+t
const transposeCharacter = createKeyboardShortcut({
  default: [],
  apple: [{key: 't', ctrl: true}],
})

/**
 * Hotkeys.
 */

export default {
  isBold: bold.guard,
  isCompose: compose.guard,
  isMoveBackward: moveBackward.guard,
  isMoveForward: moveForward.guard,
  isDeleteBackward: deleteBackward.guard,
  isDeleteForward: deleteForward.guard,
  isDeleteLineBackward: deleteLineBackward.guard,
  isDeleteLineForward: deleteLineForward.guard,
  isDeleteWordBackward: deleteWordBackward.guard,
  isDeleteWordForward: deleteWordForward.guard,
  isExtendBackward: extendBackward.guard,
  isExtendForward: extendForward.guard,
  isExtendLineBackward: extendLineBackward.guard,
  isExtendLineForward: extendLineForward.guard,
  isItalic: italic.guard,
  isMoveLineBackward: moveLineBackward.guard,
  isMoveLineForward: moveLineForward.guard,
  isMoveWordBackward: moveWordBackward.guard,
  isMoveWordForward: moveWordForward.guard,
  isRedo: redo.guard,
  isSoftBreak: insertSoftBreak.guard,
  isSplitBlock: splitBlock.guard,
  isTransposeCharacter: transposeCharacter.guard,
  isUndo: undo.guard,
}
