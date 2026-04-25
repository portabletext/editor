import type {PortableTextObject, PortableTextSpan} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getInline} from '../node-traversal/get-inline'
import type {ChildPath} from '../types/paths'

/**
 * Returns the child (span or inline object) containing the focus selection,
 * resolved at any depth.
 *
 * @public
 */
export const getFocusChild: EditorSelector<
  | {
      node: PortableTextObject | PortableTextSpan
      path: ChildPath
    }
  | undefined
> = (snapshot) => {
  const selection = snapshot.context.selection

  if (!selection) {
    return undefined
  }

  return getInline(snapshot.context, selection.focus.path)
}
