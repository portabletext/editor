import {
  isKeySegment,
  isPortableTextSpan,
  isPortableTextTextBlock,
  type PortableTextBlock,
} from '@sanity/types'
import type {EditorSelection} from '../selectors'

/**
 * @public
 */
export function sliceBlocks({
  blocks,
  selection,
}: {
  blocks: Array<PortableTextBlock>
  selection: EditorSelection
}): Array<PortableTextBlock> {
  const slice: Array<PortableTextBlock> = []

  if (!selection) {
    return slice
  }

  let startBlock: PortableTextBlock | undefined
  const middleBlocks: PortableTextBlock[] = []
  let endBlock: PortableTextBlock | undefined

  const startPoint = selection.backward ? selection.focus : selection.anchor
  const endPoint = selection.backward ? selection.anchor : selection.focus

  const startBlockKey = isKeySegment(startPoint.path[0])
    ? startPoint.path[0]._key
    : undefined
  const endBlockKey = isKeySegment(endPoint.path[0])
    ? endPoint.path[0]._key
    : undefined
  const startChildKey = isKeySegment(startPoint.path[2])
    ? startPoint.path[2]._key
    : undefined
  const endChildKey = isKeySegment(endPoint.path[2])
    ? endPoint.path[2]._key
    : undefined

  if (!startBlockKey || !endBlockKey) {
    return slice
  }

  for (const block of blocks) {
    if (block._key === startBlockKey) {
      if (isPortableTextTextBlock(block) && startChildKey) {
        for (const child of block.children) {
          if (child._key === startChildKey) {
            if (isPortableTextSpan(child)) {
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
              break
            }

            startBlock = {
              ...block,
              children: [child],
            }
            break
          }

          if (startBlock && isPortableTextTextBlock(startBlock)) {
            startBlock.children.push(child)

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
    }

    if (block._key === endBlockKey) {
      if (isPortableTextTextBlock(block) && endBlockKey) {
        endBlock = {
          ...block,
          children: [],
        }

        for (const child of block.children) {
          if (endBlock && isPortableTextTextBlock(endBlock)) {
            if (child._key === endChildKey && isPortableTextSpan(child)) {
              endBlock.children.push({
                ...child,
                text: child.text.slice(endPoint.offset),
              })
              break
            }

            endBlock.children.push(child)

            if (endChildKey && child._key === endChildKey) {
              break
            }
          }
        }

        continue
      }

      endBlock = block

      break
    }

    middleBlocks.push(block)
  }

  return [
    ...(startBlock ? [startBlock] : []),
    ...middleBlocks,
    ...(endBlock ? [endBlock] : []),
  ]
}
