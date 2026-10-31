import type {Editor} from '../interfaces/editor'
import {withChange} from './change'

/**
 * Opens a change for unit tests that drive a bare engine directly, where no
 * entry point exists to open one. The cause is a Behavior event, so what
 * `fn` applies is classified like a user action.
 */
export function inTestChange(editor: Editor, fn: () => void): void {
  withChange(editor, {type: 'behavior event'}, fn)
}
