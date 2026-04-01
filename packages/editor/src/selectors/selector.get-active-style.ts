import type {PortableTextTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {isTextBlockNode} from '../slate/node/is-text-block-node'
import {getAncestorTextBlock} from '../traversal'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'
import {getSelectedBlocks} from './selector.get-selected-blocks'

/**
 * @public
 */
export const getActiveStyle: EditorSelector<PortableTextTextBlock['style']> = (
  snapshot,
) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const selectedBlocks = getSelectedBlocks(snapshot).map((block) => block.node)
  let selectedTextBlocks = selectedBlocks.filter((block) =>
    isTextBlockNode(snapshot.context, block),
  )

  if (selectedTextBlocks.length === 0) {
    const startPoint = getSelectionStartPoint(snapshot.context.selection)
    const endPoint = getSelectionEndPoint(snapshot.context.selection)

    const startTextBlock = getAncestorTextBlock(snapshot, startPoint.path)
    const endTextBlock = getAncestorTextBlock(snapshot, endPoint.path)

    const textBlocks: Array<PortableTextTextBlock> = []

    if (startTextBlock) {
      textBlocks.push(startTextBlock.node)
    }

    if (endTextBlock && endTextBlock.node._key !== startTextBlock?.node._key) {
      textBlocks.push(endTextBlock.node)
    }

    selectedTextBlocks = textBlocks
  }

  const firstTextBlock = selectedTextBlocks.at(0)

  if (!firstTextBlock) {
    return undefined
  }

  const firstStyle = firstTextBlock.style

  if (!firstStyle) {
    return undefined
  }

  if (selectedTextBlocks.every((block) => block.style === firstStyle)) {
    return firstStyle
  }

  return undefined
}
