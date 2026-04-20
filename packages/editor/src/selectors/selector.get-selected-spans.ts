import {isSpan, type PortableTextSpan} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {Path} from '../slate/interfaces/path'
import {getSelectedChildren} from './selector.get-selected-children'

/**
 * Returns the spans touched by the selection, resolved at any depth.
 *
 * @public
 */
export const getSelectedSpans: EditorSelector<
  Array<{
    node: PortableTextSpan
    path: Path
  }>
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return []
  }

  return getSelectedChildren({
    filter: (child) => isSpan(snapshot.context, child),
  })(snapshot)
}
