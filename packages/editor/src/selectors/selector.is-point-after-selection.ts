import {isKeySegment, isPortableTextTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import type {EditorSelectionPoint} from '../types/editor'
import {reverseSelection} from '../utils/util.reverse-selection'

/**
 * @public
 */
export function isPointAfterSelection(
  point: EditorSelectionPoint,
): EditorSelector<boolean> {
  return (snapshot) => {
    if (!snapshot.context.selection) {
      return false
    }

    const selection = snapshot.context.selection.backward
      ? reverseSelection(snapshot.context.selection)
      : snapshot.context.selection

    const pointBlockKey = isKeySegment(point.path[0])
      ? point.path[0]._key
      : undefined
    const pointChildKey = isKeySegment(point.path[2])
      ? point.path[2]._key
      : undefined

    const endBlockKey = isKeySegment(selection.focus.path[0])
      ? selection.focus.path[0]._key
      : undefined
    const endChildKey = isKeySegment(selection.focus.path[2])
      ? selection.focus.path[2]._key
      : undefined

    if (!pointBlockKey || !endBlockKey) {
      return false
    }

    let after = false

    for (const block of snapshot.context.value) {
      if (block._key === endBlockKey) {
        if (block._key !== pointBlockKey) {
          after = true
          break
        }

        // Both the point and the selection end in this block

        if (!isPortableTextTextBlock(block)) {
          break
        }

        if (!pointChildKey || !endChildKey) {
          break
        }

        for (const child of block.children) {
          if (child._key === endChildKey) {
            if (child._key !== pointChildKey) {
              after = true
              break
            }

            // Both the point and the selection end in this child

            after = point.offset > selection.focus.offset
            break
          }

          if (child._key === pointChildKey) {
            break
          }
        }
      }

      if (block._key === pointBlockKey) {
        break
      }
    }

    return after
  }
}
