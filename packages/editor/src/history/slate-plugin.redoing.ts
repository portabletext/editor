import type {Editor} from 'slate'

const IS_REDOING: WeakMap<Editor, boolean | undefined> = new WeakMap()

export function pluginRedoing(editor: Editor, fn: () => void) {
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
