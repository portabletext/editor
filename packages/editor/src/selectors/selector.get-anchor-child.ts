import type {PortableTextObject, PortableTextSpan} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getNode} from '../node-traversal/get-node'
import type {Path} from '../slate/interfaces/path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getAnchorTextBlock} from './selector.get-anchor-text-block'

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

  const anchorTextBlock = getAnchorTextBlock(snapshot)

  if (!anchorTextBlock) {
    return undefined
  }

  const childSegment = selection.anchor.path.at(-1)

  if (!isKeyedSegment(childSegment)) {
    return undefined
  }

  const childPath: Path = [
    ...anchorTextBlock.path,
    'children',
    {_key: childSegment._key},
  ]

  const child = getNode(snapshot.context, childPath)

  return child
    ? {
        node: child.node as PortableTextObject | PortableTextSpan,
        path: child.path,
      }
    : undefined
}
