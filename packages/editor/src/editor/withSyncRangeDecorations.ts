import type {BaseEditor, Operation} from 'slate'
import type {ReactEditor} from 'slate-react'
import type {PortableTextSlateEditor} from '../types/editor'

// React Compiler considers `slateEditor` as immutable, and opts-out if we do this inline in a useEffect, doing it in a function moves it out of the scope, and opts-in again for the rest of the component.
export function withSyncRangeDecorations(
  slateEditor: BaseEditor & ReactEditor & PortableTextSlateEditor,
  syncRangeDecorations: (operation?: Operation) => void,
) {
  const originalApply = slateEditor.apply
  slateEditor.apply = (op: Operation) => {
    originalApply(op)
    if (op.type !== 'set_selection') {
      syncRangeDecorations(op)
    }
  }
  return () => {
    slateEditor.apply = originalApply
  }
}
