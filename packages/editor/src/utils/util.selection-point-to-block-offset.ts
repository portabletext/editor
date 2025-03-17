import type {PortableTextBlock} from '@sanity/types'
import type {BlockOffset} from '../types/block-offset'
import type {EditorSelectionPoint} from '../types/editor'
import {childSelectionPointToBlockOffset} from './util.child-selection-point-to-block-offset'
import {isKeyedSegment} from './util.is-keyed-segment'

/**
 * @public
 */
export function selectionPointToBlockOffset({
  value,
  selectionPoint,
}: {
  value: Array<PortableTextBlock>
  selectionPoint: EditorSelectionPoint
}): BlockOffset | undefined {
  if (
    selectionPoint.path.length === 1 &&
    isKeyedSegment(selectionPoint.path[0])
  ) {
    return {
      path: [{_key: selectionPoint.path[0]._key}],
      offset: selectionPoint.offset,
    }
  }

  return childSelectionPointToBlockOffset({
    value,
    selectionPoint,
  })
}
