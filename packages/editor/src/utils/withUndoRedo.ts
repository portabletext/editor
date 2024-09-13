import type {Editor} from 'slate'

const IS_UDOING: WeakMap<Editor, boolean | undefined> = new WeakMap()
const IS_REDOING: WeakMap<Editor, boolean | undefined> = new WeakMap()

export function withUndoing(editor: Editor, fn: () => void) {
  const prev = isUndoing(editor)
  IS_UDOING.set(editor, true)
  fn()
  IS_UDOING.set(editor, prev)
}

export function isUndoing(editor: Editor) {
  return IS_UDOING.get(editor) ?? false
}

export function setIsUndoing(editor: Editor, isUndoing: boolean) {
  IS_UDOING.set(editor, isUndoing)
}

export function withRedoing(editor: Editor, fn: () => void) {
  const prev = isRedoing(editor)
  IS_REDOING.set(editor, true)
  fn()
  IS_REDOING.set(editor, prev)
}

export function isRedoing(editor: Editor) {
  return IS_REDOING.get(editor) ?? false
}

export function setIsRedoing(editor: Editor, isRedoing: boolean) {
  IS_REDOING.set(editor, isRedoing)
}
