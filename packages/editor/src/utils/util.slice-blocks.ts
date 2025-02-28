import {
  isKeySegment,
  isPortableTextSpan,
  isPortableTextTextBlock,
  type PortableTextBlock,
} from '@sanity/types'
import type {EditorSelection} from '..'

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
    if (!isPortableTextTextBlock(block)) {
      if (block._key === startBlockKey && block._key === endBlockKey) {
        startBlock = block
        break
      }
    }

    if (block._key === startBlockKey) {
      if (!isPortableTextTextBlock(block)) {
        startBlock = block
        continue
      }

      if (startChildKey) {
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

          if (startBlock && isPortableTextTextBlock(startBlock)) {
            if (
              endChildKey &&
              child._key === endChildKey &&
              isPortableTextSpan(child)
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
      if (!isPortableTextTextBlock(block)) {
        endBlock = block
        break
      }

      if (endChildKey) {
        endBlock = {
          ...block,
          children: [],
        }

        for (const child of block.children) {
          if (endBlock && isPortableTextTextBlock(endBlock)) {
            if (child._key === endChildKey && isPortableTextSpan(child)) {
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
