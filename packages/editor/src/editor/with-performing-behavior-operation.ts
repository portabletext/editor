import type {Editor} from 'slate'

const IS_PERFORMING_OPERATION: WeakMap<Editor, boolean | undefined> =
  new WeakMap()

export function withPerformingBehaviorOperation(
  editor: Editor,
  fn: () => void,
) {
  const prev = IS_PERFORMING_OPERATION.get(editor)

  IS_PERFORMING_OPERATION.set(editor, true)

  fn()

  IS_PERFORMING_OPERATION.set(editor, prev)
}

export function isPerformingBehaviorOperation(editor: Editor) {
  return IS_PERFORMING_OPERATION.get(editor) ?? false
}
