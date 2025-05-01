import type {EditorSelector} from '../editor/editor-selector'
import {isTextBlock} from '../internal-utils/parse-blocks'
import type {EditorSelectionPoint} from '../types/editor'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {reverseSelection} from '../utils/util.reverse-selection'

/**
 * @public
 */
export function isPointBeforeSelection(
  point: EditorSelectionPoint,
): EditorSelector<boolean> {
  return (snapshot) => {
    if (!snapshot.context.selection) {
      return false
    }

    const selection = snapshot.context.selection.backward
      ? reverseSelection(snapshot.context.selection)
      : snapshot.context.selection

    const pointBlockKey = isKeyedSegment(point.path[0])
      ? point.path[0]._key
      : undefined
    const pointChildKey = isKeyedSegment(point.path[2])
      ? point.path[2]._key
      : undefined

    const startBlockKey = isKeyedSegment(selection.anchor.path[0])
      ? selection.anchor.path[0]._key
      : undefined
    const startChildKey = isKeyedSegment(selection.anchor.path[2])
      ? selection.anchor.path[2]._key
      : undefined

    if (!pointBlockKey || !startBlockKey) {
      return false
    }

    let before = false

    for (const block of snapshot.context.value) {
      if (block._key === pointBlockKey) {
        if (block._key !== startBlockKey) {
          before = true
          break
        }

        // Both the point and the selection start in this block

        if (!isTextBlock(snapshot.context, block)) {
          break
        }

        if (!pointChildKey || !startChildKey) {
          break
        }

        for (const child of block.children) {
          if (child._key === pointChildKey) {
            if (child._key !== startChildKey) {
              before = true
              break
            }

            // Both the point and the selection start in this child

            before = point.offset < selection.anchor.offset
            break
          }

          if (child._key === startChildKey) {
            break
          }
        }
      }

      if (block._key === startBlockKey) {
        break
      }
    }

    return before
  }
}
