import type {PortableTextObject} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getChildren} from '../node-traversal/get-children'
import {isObjectNode} from '../slate/node/is-object-node'
import {parentPath} from '../slate/path/parent-path'
import type {ChildPath} from '../types/paths'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getSelectionEndPoint} from './selector.get-selection-end-point'

/**
 * Returns all inline objects after the selection end within the same text
 * block, resolved at any depth.
 *
 * @public
 */
export const getNextInlineObjects: EditorSelector<
  Array<{node: PortableTextObject; path: ChildPath}>
> = (snapshot) => {
  const point = getSelectionEndPoint(snapshot)

  if (!point) {
    return []
  }

  const endSegment = point.path.at(-1)
  const endKey = isKeyedSegment(endSegment) ? endSegment._key : undefined

  if (!endKey) {
    return []
  }

  const children = getChildren(snapshot.context, parentPath(point.path))
  const inlineObjects: Array<{node: PortableTextObject; path: ChildPath}> = []
  let endFound = false

  for (const child of children) {
    const segment = child.path.at(-1)
    const childKey = isKeyedSegment(segment) ? segment._key : undefined

    if (childKey === endKey) {
      endFound = true
      continue
    }

    if (
      endFound &&
      isObjectNode({schema: snapshot.context.schema}, child.node)
    ) {
      inlineObjects.push({
        node: child.node,
        path: child.path,
      })
    }
  }

  return inlineObjects
}
