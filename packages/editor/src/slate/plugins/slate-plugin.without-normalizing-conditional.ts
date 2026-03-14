import {withoutNormalizing} from '../editor/without-normalizing'
import type {Editor} from '../interfaces/editor'

export function withoutNormalizingConditional(
  editor: Editor,
  predicate: () => boolean,
  fn: () => void,
) {
  if (predicate()) {
    withoutNormalizing(editor, fn)
  } else {
    fn()
  }
}
