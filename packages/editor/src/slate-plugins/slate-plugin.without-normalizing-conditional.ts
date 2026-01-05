import {Editor} from 'slate'

export function withoutNormalizingConditional(
  editor: Editor,
  predicate: () => boolean,
  fn: () => void,
) {
  if (predicate()) {
    Editor.withoutNormalizing(editor, fn)
  } else {
    fn()
  }
}
