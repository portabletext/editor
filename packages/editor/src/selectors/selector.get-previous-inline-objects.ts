import type {PortableTextObject} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {parentPath} from '../engine/path/parent-path'
import {getChildren} from '../traversal/get-children'
import {isObjectAtPath} from '../traversal/is-object-at-path'
import type {ChildPath} from '../types/paths'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getSelectionStartPoint} from './selector.get-selection-start-point'

/**
 * Returns all inline objects before the selection start within the same text
 * block, resolved at any depth.
 *
 * @public
 */
export const getPreviousInlineObjects: EditorSelector<
  Array<{node: PortableTextObject; path: ChildPath}>
> = (snapshot) => {
  const point = getSelectionStartPoint(snapshot)

  if (!point) {
    return []
  }

  const startSegment = point.path.at(-1)
  const startKey = isKeyedSegment(startSegment) ? startSegment._key : undefined

  if (!startKey) {
    return []
  }

  const children = getChildren(snapshot, parentPath(point.path))
  const inlineObjects: Array<{node: PortableTextObject; path: ChildPath}> = []

  for (const child of children) {
    const segment = child.path.at(-1)
    const childKey = isKeyedSegment(segment) ? segment._key : undefined

    if (childKey === startKey) {
      break
    }

    if (isObjectAtPath(snapshot, child.node, child.path)) {
      inlineObjects.push({
        node: child.node,
        path: child.path,
      })
    }
  }

  return inlineObjects
}
