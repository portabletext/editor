import type {Editor} from '../slate'
import {withoutNormalizing} from '../slate/editor/without-normalizing'

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
