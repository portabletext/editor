import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {sliceBlocks} from '../utils/util.slice-blocks'
import {getSelectedBlocks} from './selector.get-selected-blocks'
import {getSelectionEndBlock} from './selector.get-selection-end-block'
import {getSelectionStartBlock} from './selector.get-selection-start-block'

/**
 * Returns the portion of the document's value covered by the selection,
 * resolved at any depth.
 *
 * When the selection is inside an editable container, only the blocks within
 * that container are included, with the first and last trimmed to the
 * selection endpoints.
 *
 * @public
 */
export const getSelectedValue: EditorSelector<Array<PortableTextBlock>> = (
  snapshot,
) => {
  const selection = snapshot.context.selection

  if (!selection) {
    return []
  }

  const startBlock = getSelectionStartBlock(snapshot)
  const endBlock = getSelectionEndBlock(snapshot)

  if (!startBlock || !endBlock) {
    return []
  }

  if (startBlock.node._key === endBlock.node._key) {
    const slicedStartBlock = sliceBlocks({
      context: snapshot.context,
      blocks: [startBlock.node],
    }).at(0)

    return slicedStartBlock ? [slicedStartBlock] : []
  }

  const selectedBlocks = getSelectedBlocks(snapshot)

  const slicedStartBlock = sliceBlocks({
    context: snapshot.context,
    blocks: [startBlock.node],
  }).at(0)

  const slicedEndBlock = sliceBlocks({
    context: snapshot.context,
    blocks: [endBlock.node],
  }).at(0)

  const middleBlocks = selectedBlocks.slice(1, -1).map((entry) => entry.node)

  return [
    ...(slicedStartBlock ? [slicedStartBlock] : []),
    ...middleBlocks,
    ...(slicedEndBlock ? [slicedEndBlock] : []),
  ]
}
