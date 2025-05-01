import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {sliceBlocks} from '../utils'

/**
 * @public
 */
export const getSelectedSlice: EditorSelector<Array<PortableTextBlock>> = (
  snapshot,
) => {
  return sliceBlocks({
    context: snapshot.context,
    blocks: snapshot.context.value,
  })
}
