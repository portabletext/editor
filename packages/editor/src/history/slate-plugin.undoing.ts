import type {Editor} from 'slate'

const IS_UDOING: WeakMap<Editor, boolean | undefined> = new WeakMap()

export function pluginUndoing(editor: Editor, fn: () => void) {
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
