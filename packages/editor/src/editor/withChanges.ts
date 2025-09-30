import type {Editor} from 'slate'
import {IS_PROCESSING_REMOTE_CHANGES} from './weakMaps'

export function withRemoteChanges(editor: Editor, fn: () => void): void {
  const prev = isChangingRemotely(editor) || false
  IS_PROCESSING_REMOTE_CHANGES.set(editor, true)
  fn()
  IS_PROCESSING_REMOTE_CHANGES.set(editor, prev)
}

export function isChangingRemotely(editor: Editor): boolean | undefined {
  return IS_PROCESSING_REMOTE_CHANGES.get(editor)
}
