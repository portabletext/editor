import {Editor} from 'slate'
import {defaultKeyGenerator} from './key-generator'

const CURRENT_ACTION_ID: WeakMap<Editor, string | undefined> = new WeakMap()

export function withApplyingBehaviorActions(editor: Editor, fn: () => void) {
  CURRENT_ACTION_ID.set(editor, defaultKeyGenerator())
  Editor.withoutNormalizing(editor, fn)
  CURRENT_ACTION_ID.set(editor, undefined)
}

export function getCurrentActionId(editor: Editor) {
  return CURRENT_ACTION_ID.get(editor)
}

export function isApplyingBehaviorActions(editor: Editor) {
  return getCurrentActionId(editor) !== undefined
}

////////

const CURRENT_BEHAVIOR_ACTION_SET: WeakMap<
  Editor,
  {actionSetId: string} | undefined
> = new WeakMap()

export function withApplyingBehaviorActionSet(editor: Editor, fn: () => void) {
  const current = CURRENT_BEHAVIOR_ACTION_SET.get(editor)
  CURRENT_BEHAVIOR_ACTION_SET.set(editor, {
    actionSetId: defaultKeyGenerator(),
  })
  withApplyingBehaviorActions(editor, fn)
  CURRENT_BEHAVIOR_ACTION_SET.set(editor, current)
}

export function getCurrentBehaviorActionSetId(editor: Editor) {
  return CURRENT_BEHAVIOR_ACTION_SET.get(editor)?.actionSetId
}
