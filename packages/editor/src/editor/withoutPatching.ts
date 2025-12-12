import type {PortableTextSlateEditor} from '../types/slate-editor'

export function withoutPatching(
  editor: PortableTextSlateEditor,
  fn: () => void,
): void {
  const prev = editor.isPatching
  editor.isPatching = false
  fn()
  editor.isPatching = prev
}
