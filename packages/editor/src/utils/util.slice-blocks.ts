import type {PortableTextBlock} from '@sanity/types'
import type {EditorContext} from '..'
import {isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import {isKeyedSegment} from './util.is-keyed-segment'

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

  const startPoint = context.selection.backward
    ? context.selection.focus
    : context.selection.anchor
  const endPoint = context.selection.backward
    ? context.selection.anchor
    : context.selection.focus

  const startBlockKey = isKeyedSegment(startPoint.path[0])
    ? startPoint.path[0]._key
    : undefined
  const endBlockKey = isKeyedSegment(endPoint.path[0])
    ? endPoint.path[0]._key
    : undefined
  const startChildKey = isKeyedSegment(startPoint.path[2])
    ? startPoint.path[2]._key
    : undefined
  const endChildKey = isKeyedSegment(endPoint.path[2])
    ? endPoint.path[2]._key
    : undefined

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
