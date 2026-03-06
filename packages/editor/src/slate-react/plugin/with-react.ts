import ReactDOM from 'react-dom'
import type {Editor} from '../../slate'
import {IS_ANDROID, withDOM} from '../../slate-dom'
import {REACT_MAJOR_VERSION} from '../utils/environment'
import type {ReactEditor} from './react-editor'

/**
 * `withReact` adds React and DOM specific behaviors to the editor.
 *
 * If you are using TypeScript, you must extend Slate's CustomTypes to use
 * this plugin.
 *
 * See https://docs.slatejs.org/concepts/11-typescript to learn how.
 */
export const withReact = <T extends Editor>(
  editor: T,
  clipboardFormatKey = 'x-slate-fragment',
): T & ReactEditor => {
  let e = editor as T & ReactEditor

  e = withDOM(e, clipboardFormatKey)

  const {onChange, apply, insertText} = e

  e.getChunkSize = () => null
  e.keyToChunkTree = new WeakMap()

  if (IS_ANDROID) {
    e.insertText = (text, options) => {
      // COMPAT: Android devices, specifically Samsung devices, experience cursor jumping.
      // This issue occurs when the ⁠insertText function is called immediately after typing.
      // The problem arises because typing schedules a selection change.
      // However, this selection change is only executed after the ⁠insertText function.
      // As a result, the already obsolete selection is applied, leading to incorrect
      // final cursor position.
      e.pendingSelection = null

      return insertText(text, options)
    }
  }

  e.onChange = (options) => {
    // COMPAT: React < 18 doesn't batch `setState` hook calls, which means
    // that the children and selection can get out of sync for one render
    // pass. So we have to use this unstable API to ensure it batches them.
    // (2019/12/03)
    // https://github.com/facebook/react/issues/14259#issuecomment-439702367
    const maybeBatchUpdates =
      REACT_MAJOR_VERSION < 18
        ? ReactDOM.unstable_batchedUpdates
        : (callback: () => void) => callback()

    maybeBatchUpdates(() => {
      onChange(options)
    })
  }

  e.apply = (operation) => {
    apply(operation)
  }

  return e
}
