import type {Editor} from 'slate'

const IS_APPLYING_BEHAVIOR_ACTIONS: WeakMap<Editor, boolean | undefined> =
  new WeakMap()

export function withApplyingBehaviorActions(editor: Editor, fn: () => void) {
  const prev = isApplyingBehaviorActions(editor)
  IS_APPLYING_BEHAVIOR_ACTIONS.set(editor, true)
  fn()
  IS_APPLYING_BEHAVIOR_ACTIONS.set(editor, prev)
}

export function isApplyingBehaviorActions(editor: Editor) {
  return IS_APPLYING_BEHAVIOR_ACTIONS.get(editor) ?? false
}
