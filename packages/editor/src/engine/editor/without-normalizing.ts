import {
  beginOperationTransaction,
  endOperationTransaction,
} from '../core/operation-channel'
import type {Editor} from '../interfaces/editor'
import {isNormalizing} from './is-normalizing'
import {normalize} from './normalize'
import {setNormalizing} from './set-normalizing'

export function withoutNormalizing(editor: Editor, fn: () => void): void {
  beginOperationTransaction(editor)
  const value = isNormalizing(editor)
  setNormalizing(editor, false)
  try {
    fn()
  } finally {
    setNormalizing(editor, value)
    try {
      normalize(editor)
    } finally {
      endOperationTransaction(editor)
    }
  }
}
