import ReactDOM from 'react-dom'
import type {Editor} from '../../slate'
import {withDOM} from '../../slate-dom'
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
export const withReact = <T extends Editor>(editor: T): T & ReactEditor => {
  let e = editor as T & ReactEditor

  e = withDOM(e)

  const {onChange, apply} = e

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
