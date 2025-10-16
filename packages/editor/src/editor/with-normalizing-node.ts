import type {Editor} from 'slate'

const IS_NORMALIZING_NODE: WeakMap<Editor, boolean | undefined> = new WeakMap()

export function withNormalizeNode(editor: Editor, fn: () => void) {
  const prev = IS_NORMALIZING_NODE.get(editor)
  IS_NORMALIZING_NODE.set(editor, true)
  fn()
  IS_NORMALIZING_NODE.set(editor, prev)
}

export function isNormalizingNode(editor: Editor) {
  return IS_NORMALIZING_NODE.get(editor) ?? false
}
