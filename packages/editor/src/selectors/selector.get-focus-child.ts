import {
  isTextBlock,
  type PortableTextObject,
  type PortableTextSpan,
} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getNode} from '../node-traversal/get-node'
import type {Path} from '../slate/interfaces/path'
import {parentPath} from '../slate/path/parent-path'

/**
 * Returns the child (span or inline object) containing the focus selection,
 * resolved at any depth.
 *
 * @public
 */
export const getFocusChild: EditorSelector<
  | {
      node: PortableTextObject | PortableTextSpan
      path: Path
    }
  | undefined
> = (snapshot) => {
  const selection = snapshot.context.selection

  if (!selection) {
    return undefined
  }

  const entry = getNode(snapshot.context, selection.focus.path)

  if (!entry) {
    return undefined
  }

  const parent = getNode(snapshot.context, parentPath(entry.path))

  if (!parent || !isTextBlock(snapshot.context, parent.node)) {
    return undefined
  }

  return {
    node: entry.node as PortableTextObject | PortableTextSpan,
    path: entry.path,
  }
}
