import type {PortableTextBlock} from '@sanity/types'
import type {EditorContext} from '..'
import {isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../selection/selection-point'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'

/**
 * @public
 */
export function sliceBlocks({
  context,
  blocks,
}: {
  context: Pick<EditorContext, 'schema' | 'selection'>
  blocks: Array<PortableTextBlock>
}): Array<PortableTextBlock> {
  const slice: Array<PortableTextBlock> = []

  if (!context.selection) {
    return slice
  }

  let startBlock: PortableTextBlock | undefined
  const middleBlocks: PortableTextBlock[] = []
  let endBlock: PortableTextBlock | undefined

  const startPoint = getSelectionStartPoint(context.selection)
  const endPoint = getSelectionEndPoint(context.selection)
  const startBlockKey = getBlockKeyFromSelectionPoint(startPoint)
  const startChildKey = getChildKeyFromSelectionPoint(startPoint)
  const endBlockKey = getBlockKeyFromSelectionPoint(endPoint)
  const endChildKey = getChildKeyFromSelectionPoint(endPoint)

  if (!startBlockKey || !endBlockKey) {
    return slice
  }

  for (const block of blocks) {
    if (!isTextBlock(context, block)) {
      if (block._key === startBlockKey && block._key === endBlockKey) {
        startBlock = block
        break
      }
    }

    if (block._key === startBlockKey) {
      if (!isTextBlock(context, block)) {
        startBlock = block
        continue
      }

      if (startChildKey) {
        for (const child of block.children) {
          if (child._key === startChildKey) {
            if (isSpan(context, child)) {
              const text =
                child._key === endChildKey
                  ? child.text.slice(startPoint.offset, endPoint.offset)
                  : child.text.slice(startPoint.offset)

              startBlock = {
                ...block,
                children: [
                  {
                    ...child,
                    text,
                  },
                ],
              }
            } else {
              startBlock = {
                ...block,
                children: [child],
              }
            }

            if (startChildKey === endChildKey) {
              break
            }
            continue
          }

          if (startBlock && isTextBlock(context, startBlock)) {
            if (
              endChildKey &&
              child._key === endChildKey &&
              isSpan(context, child)
            ) {
              startBlock.children.push({
                ...child,
                text: child.text.slice(0, endPoint.offset),
              })
            } else {
              startBlock.children.push(child)
            }

            if (
              block._key === endBlockKey &&
              endChildKey &&
              child._key === endChildKey
            ) {
              break
            }
          }
        }

        if (startBlockKey === endBlockKey) {
          break
        }

        continue
      }

      startBlock = block

      if (startBlockKey === endBlockKey) {
        break
      }
    }

    if (block._key === endBlockKey) {
      if (!isTextBlock(context, block)) {
        endBlock = block
        break
      }

      if (endChildKey) {
        endBlock = {
          ...block,
          children: [],
        }

        for (const child of block.children) {
          if (endBlock && isTextBlock(context, endBlock)) {
            if (child._key === endChildKey && isSpan(context, child)) {
              endBlock.children.push({
                ...child,
                text: child.text.slice(0, endPoint.offset),
              })

              break
            }

            endBlock.children.push(child)

            if (endChildKey && child._key === endChildKey) {
              break
            }
          }
        }

        break
      }

      endBlock = block

      break
    }

    if (startBlock) {
      middleBlocks.push(block)
    }
  }

  return [
    ...(startBlock ? [startBlock] : []),
    ...middleBlocks,
    ...(endBlock ? [endBlock] : []),
  ]
}
