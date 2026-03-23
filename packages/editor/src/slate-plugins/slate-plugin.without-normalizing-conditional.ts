import {withoutNormalizing} from '../slate/editor/without-normalizing'
import type {Editor} from '../slate/interfaces/editor'

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
