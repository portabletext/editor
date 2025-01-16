import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {sliceBlocks} from '../utils'

/**
 * @public
 */
export const getSelectedSlice: EditorSelector<Array<PortableTextBlock>> = ({
  context,
}) => {
  return sliceBlocks({blocks: context.value, selection: context.selection})
}
