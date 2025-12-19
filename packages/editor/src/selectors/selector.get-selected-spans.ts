import {isSpan, type PortableTextSpan} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {ChildPath} from '../types/paths'
import {getSelectedChildren} from './selector.get-selected-children'

/**
 * @public
 */
export const getSelectedSpans: EditorSelector<
  Array<{
    node: PortableTextSpan
    path: ChildPath
  }>
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return []
  }

  return getSelectedChildren({
    filter: (child) => isSpan(snapshot.context, child),
  })(snapshot)
}
