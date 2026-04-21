import {
  isTextBlock,
  type PortableTextObject,
  type PortableTextSpan,
} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getNode} from '../node-traversal/get-node'
import type {Path} from '../slate/interfaces/path'
import {parentPath} from '../slate/path/parent-path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * Returns the child (span or inline object) containing the anchor selection,
 * resolved at any depth.
 *
 * @public
 */
export const getAnchorChild: EditorSelector<
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

  const childSegment = selection.anchor.path.at(-1)

  if (!isKeyedSegment(childSegment)) {
    return undefined
  }

  const parent = getNode(snapshot.context, parentPath(selection.anchor.path))

  if (!parent || !isTextBlock(snapshot.context, parent.node)) {
    return undefined
  }

  const child = parent.node.children.find(
    (candidate) => candidate._key === childSegment._key,
  )

  if (!child) {
    return undefined
  }

  return {
    node: child,
    path: [...parent.path, 'children', {_key: child._key}],
  }
}
