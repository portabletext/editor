import {Editor} from 'slate'
import {defaultKeyGenerator} from './key-generator'

const IS_APPLYING_BEHAVIOR_ACTIONS: WeakMap<Editor, boolean | undefined> =
  new WeakMap()

export function withApplyingBehaviorActions(editor: Editor, fn: () => void) {
  const prev = IS_APPLYING_BEHAVIOR_ACTIONS.get(editor)
  IS_APPLYING_BEHAVIOR_ACTIONS.set(editor, true)
  Editor.withoutNormalizing(editor, fn)
  IS_APPLYING_BEHAVIOR_ACTIONS.set(editor, prev)
}

export function isApplyingBehaviorActions(editor: Editor) {
  return IS_APPLYING_BEHAVIOR_ACTIONS.get(editor) ?? false
}

////////

const CURRENT_BEHAVIOR_ACTION_INTEND_SET: WeakMap<
  Editor,
  {actionSetId: string} | undefined
> = new WeakMap()

export function withApplyingBehaviorActionIntendSet(
  editor: Editor,
  fn: () => void,
) {
  const current = CURRENT_BEHAVIOR_ACTION_INTEND_SET.get(editor)
  CURRENT_BEHAVIOR_ACTION_INTEND_SET.set(editor, {
    actionSetId: defaultKeyGenerator(),
  })
  withApplyingBehaviorActions(editor, fn)
  CURRENT_BEHAVIOR_ACTION_INTEND_SET.set(editor, current)
}

export function getCurrentBehaviorActionSetId(editor: Editor) {
  return CURRENT_BEHAVIOR_ACTION_INTEND_SET.get(editor)?.actionSetId
}
