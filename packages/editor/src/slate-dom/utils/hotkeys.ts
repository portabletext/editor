import {createKeyboardShortcut} from '@portabletext/keyboard-shortcuts'

const bold = createKeyboardShortcut({
  default: [{key: 'B', ctrl: true, meta: false, alt: false, shift: false}],
  apple: [{key: 'B', ctrl: false, meta: true, alt: false, shift: false}],
})

const moveBackward = createKeyboardShortcut({
  default: [
    {key: 'ArrowLeft', shift: false, ctrl: false, meta: false, alt: false},
  ],
})

const moveForward = createKeyboardShortcut({
  default: [
    {key: 'ArrowRight', shift: false, ctrl: false, meta: false, alt: false},
  ],
})

const moveWordBackward = createKeyboardShortcut({
  default: [
    {key: 'ArrowLeft', ctrl: true, shift: false, meta: false, alt: false},
  ],
  apple: [
    {key: 'ArrowLeft', ctrl: true, shift: false, meta: false, alt: false},
    {key: 'ArrowLeft', alt: true, shift: false, ctrl: false, meta: false},
  ],
})

const moveWordForward = createKeyboardShortcut({
  default: [
    {key: 'ArrowRight', ctrl: true, shift: false, meta: false, alt: false},
  ],
  apple: [
    {key: 'ArrowRight', ctrl: true, shift: false, meta: false, alt: false},
    {key: 'ArrowRight', alt: true, shift: false, ctrl: false, meta: false},
  ],
})

const deleteBackward = createKeyboardShortcut({
  default: [
    {key: 'Backspace', ctrl: false, meta: false, alt: false},
    {key: 'Backspace', shift: true, ctrl: false, meta: false, alt: false},
  ],
  apple: [
    {key: 'Backspace', ctrl: false, meta: false, alt: false},
    {key: 'Backspace', shift: true, ctrl: false, meta: false, alt: false},
    {key: 'Backspace', ctrl: true, shift: false, meta: false, alt: false},
    {key: 'h', ctrl: true, shift: false, meta: false, alt: false},
  ],
})

const deleteForward = createKeyboardShortcut({
  default: [
    {key: 'Delete', ctrl: false, meta: false, alt: false},
    {key: 'Delete', shift: true, ctrl: false, meta: false, alt: false},
  ],
  apple: [
    {key: 'Delete', ctrl: false, meta: false, alt: false},
    {key: 'Delete', shift: true, ctrl: false, meta: false, alt: false},
    {key: 'Delete', ctrl: true, shift: false, meta: false, alt: false},
    {key: 'd', ctrl: true, shift: false, meta: false, alt: false},
  ],
})

const extendBackward = createKeyboardShortcut({
  default: [
    {key: 'ArrowLeft', shift: true, ctrl: false, meta: false, alt: false},
  ],
})

const extendForward = createKeyboardShortcut({
  default: [
    {key: 'ArrowRight', shift: true, ctrl: false, meta: false, alt: false},
  ],
})

const italic = createKeyboardShortcut({
  default: [{key: 'I', ctrl: true, meta: false, alt: false, shift: false}],
  apple: [{key: 'I', ctrl: false, meta: true, alt: false, shift: false}],
})

const insertSoftBreak = createKeyboardShortcut({
  default: [{key: 'Enter', shift: true, ctrl: false, meta: false, alt: false}],
})

const splitBlock = createKeyboardShortcut({
  default: [{key: 'Enter', shift: false, ctrl: false, meta: false, alt: false}],
})

const undo = createKeyboardShortcut({
  default: [{key: 'Z', ctrl: true, meta: false, alt: false, shift: false}],
  apple: [{key: 'Z', ctrl: false, meta: true, alt: false, shift: false}],
})

const moveLineBackward = createKeyboardShortcut({
  default: [],
  apple: [{key: 'ArrowUp', alt: true, shift: false, ctrl: false, meta: false}],
})

const moveLineForward = createKeyboardShortcut({
  default: [],
  apple: [
    {key: 'ArrowDown', alt: true, shift: false, ctrl: false, meta: false},
  ],
})

const deleteLineBackward = createKeyboardShortcut({
  default: [],
  apple: [
    {key: 'Backspace', meta: true, ctrl: false, alt: false},
    {key: 'Backspace', meta: true, shift: true, ctrl: false, alt: false},
  ],
})

const deleteLineForward = createKeyboardShortcut({
  default: [],
  apple: [
    {key: 'Delete', meta: true, ctrl: false, alt: false},
    {key: 'Delete', meta: true, shift: true, ctrl: false, alt: false},
    {key: 'k', ctrl: true, shift: false, meta: false, alt: false},
  ],
})

const deleteWordBackward = createKeyboardShortcut({
  default: [
    {key: 'Backspace', ctrl: true, meta: false, alt: false},
    {key: 'Backspace', ctrl: true, shift: true, meta: false, alt: false},
  ],
  apple: [
    {key: 'Backspace', alt: true, ctrl: false, meta: false},
    {key: 'Backspace', alt: true, shift: true, ctrl: false, meta: false},
  ],
})

const deleteWordForward = createKeyboardShortcut({
  default: [
    {key: 'Delete', ctrl: true, meta: false, alt: false},
    {key: 'Delete', ctrl: true, shift: true, meta: false, alt: false},
  ],
  apple: [
    {key: 'Delete', alt: true, ctrl: false, meta: false},
    {key: 'Delete', alt: true, shift: true, ctrl: false, meta: false},
  ],
})

const extendLineBackward = createKeyboardShortcut({
  default: [],
  apple: [{key: 'ArrowUp', alt: true, shift: true, ctrl: false, meta: false}],
})

const extendLineForward = createKeyboardShortcut({
  default: [],
  apple: [{key: 'ArrowDown', alt: true, shift: true, ctrl: false, meta: false}],
})

const redo = createKeyboardShortcut({
  default: [
    {key: 'Y', ctrl: true, meta: false, alt: false, shift: false},
    {key: 'Z', ctrl: true, meta: false, alt: false, shift: true},
  ],
  apple: [{key: 'Z', ctrl: false, meta: true, alt: false, shift: true}],
})

const transposeCharacter = createKeyboardShortcut({
  default: [],
  apple: [{key: 't', ctrl: true, shift: false, meta: false, alt: false}],
})

export default {
  isBold: bold.guard,
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
