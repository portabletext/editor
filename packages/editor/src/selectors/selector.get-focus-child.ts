import type {PortableTextObject, PortableTextSpan} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getNode} from '../node-traversal/get-node'
import type {Path} from '../slate/interfaces/path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getFocusTextBlock} from './selector.get-focus-text-block'

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

  const focusTextBlock = getFocusTextBlock(snapshot)

  if (!focusTextBlock) {
    return undefined
  }

  const childSegment = selection.focus.path.at(-1)

  if (!isKeyedSegment(childSegment)) {
    return undefined
  }

  const childPath: Path = [
    ...focusTextBlock.path,
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
