import type {PortableTextBlock} from '@sanity/types'
import type {BlockOffset} from '../types/block-offset'
import type {EditorSelectionPoint} from '../types/editor'

/**
 * @public
 */
export function blockOffsetToBlockSelectionPoint({
  value,
  blockOffset,
}: {
  value: Array<PortableTextBlock>
  blockOffset: BlockOffset
}): EditorSelectionPoint | undefined {
  let selectionPoint: EditorSelectionPoint | undefined

  for (const block of value) {
    if (block._key === blockOffset.path[0]._key) {
      selectionPoint = {
        path: [{_key: block._key}],
        offset: blockOffset.offset,
      }
      break
    }
  }

  return selectionPoint
}
