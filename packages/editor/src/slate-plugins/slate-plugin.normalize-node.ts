import type {PortableTextSlateEditor} from '../types/slate-editor'

export function withNormalizeNode(
  editor: PortableTextSlateEditor,
  fn: () => void,
) {
  const prev = editor.isNormalizingNode
  editor.isNormalizingNode = true
  fn()
  editor.isNormalizingNode = prev
}
