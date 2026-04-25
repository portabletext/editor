import type {PortableTextObject, PortableTextSpan} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getInline} from '../node-traversal/get-inline'
import type {ChildPath} from '../types/paths'

/**
 * Returns the child (span or inline object) containing the anchor selection,
 * resolved at any depth.
 *
 * @public
 */
export const getAnchorChild: EditorSelector<
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

  return getInline(snapshot.context, selection.anchor.path)
}
