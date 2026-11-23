import {withoutNormalizing} from '../engine/editor/normalize'
import type {Editor} from '../engine/interfaces/editor'

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
