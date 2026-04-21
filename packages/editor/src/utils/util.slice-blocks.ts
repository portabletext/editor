import {isSpan, isTextBlock, type PortableTextBlock} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import {getEnclosingBlock} from '../node-traversal/get-enclosing-block'
import type {Path} from '../slate/interfaces/path'
import {defaultKeyGenerator} from './key-generator'
import {parseBlock} from './parse-blocks'
import {getSelectionEndPoint} from './util.get-selection-end-point'
import {getSelectionStartPoint} from './util.get-selection-start-point'
import {isKeyedSegment} from './util.is-keyed-segment'

/**
 * @public
 */
export function sliceBlocks({
  context,
  blocks,
}: {
  context: Pick<
    EditorContext,
    'schema' | 'selection' | 'value' | 'containers'
  > & {
    keyGenerator?: () => string
  }
  blocks: Array<PortableTextBlock>
}): Array<PortableTextBlock> {
  const slice: Array<PortableTextBlock> = []

  if (!context.selection) {
    return slice
  }

  const startPoint = getSelectionStartPoint(context.selection)
  const endPoint = getSelectionEndPoint(context.selection)

  if (!startPoint || !endPoint) {
    return slice
  }

  const startBlock = getEnclosingBlock(context, startPoint.path)
  const endBlock = getEnclosingBlock(context, endPoint.path)

  if (!startBlock || !endBlock) {
    return slice
  }

  const startBlockKey = startBlock.node._key
  const endBlockKey = endBlock.node._key
  const startChildKey = childKeyInsideBlock(startPoint.path, startBlock.path)
  const endChildKey = childKeyInsideBlock(endPoint.path, endBlock.path)

  let slicedStart: PortableTextBlock | undefined
  const middleBlocks: PortableTextBlock[] = []
  let slicedEnd: PortableTextBlock | undefined

  for (const block of blocks) {
    if (!isTextBlock(context, block)) {
      if (block._key === startBlockKey && block._key === endBlockKey) {
        slicedStart = block
        break
      }
    }

    if (block._key === startBlockKey) {
      if (!isTextBlock(context, block)) {
        slicedStart = block
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

              slicedStart = {
                ...block,
                children: [
                  {
                    ...child,
                    text,
                  },
                ],
              }
            } else {
              slicedStart = {
                ...block,
                children: [child],
              }
            }

            if (block._key === endBlockKey && startChildKey === endChildKey) {
              break
            }
            continue
          }

          if (slicedStart && isTextBlock(context, slicedStart)) {
            if (
              endChildKey &&
              child._key === endChildKey &&
              isSpan(context, child)
            ) {
              slicedStart.children.push({
                ...child,
                text: child.text.slice(0, endPoint.offset),
              })
            } else {
              slicedStart.children.push(child)
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

      slicedStart = block

      if (startBlockKey === endBlockKey) {
        break
      }
    }

    if (block._key === endBlockKey) {
      if (!isTextBlock(context, block)) {
        slicedEnd = block
        break
      }

      if (endChildKey) {
        slicedEnd = {
          ...block,
          children: [],
        }

        for (const child of block.children) {
          if (slicedEnd && isTextBlock(context, slicedEnd)) {
            if (child._key === endChildKey && isSpan(context, child)) {
              slicedEnd.children.push({
                ...child,
                text: child.text.slice(0, endPoint.offset),
              })

              break
            }

            slicedEnd.children.push(child)

            if (endChildKey && child._key === endChildKey) {
              break
            }
          }
        }

        break
      }

      slicedEnd = block

      break
    }

    if (slicedStart) {
      middleBlocks.push(
        parseBlock({
          context: {
            schema: context.schema,
            keyGenerator: context.keyGenerator ?? defaultKeyGenerator,
          },
          block,
          options: {
            normalize: false,
            removeUnusedMarkDefs: true,
            validateFields: false,
          },
        }) ?? block,
      )
    }
  }

  const parsedStartBlock = slicedStart
    ? parseBlock({
        context: {
          schema: context.schema,
          keyGenerator: context.keyGenerator ?? defaultKeyGenerator,
        },
        block: slicedStart,
        options: {
          normalize: false,
          removeUnusedMarkDefs: true,
          validateFields: false,
        },
      })
    : undefined

  const parsedEndBlock = slicedEnd
    ? parseBlock({
        context: {
          schema: context.schema,
          keyGenerator: context.keyGenerator ?? defaultKeyGenerator,
        },
        block: slicedEnd,
        options: {
          normalize: false,
          removeUnusedMarkDefs: true,
          validateFields: false,
        },
      })
    : undefined

  return [
    ...(parsedStartBlock ? [parsedStartBlock] : []),
    ...middleBlocks,
    ...(parsedEndBlock ? [parsedEndBlock] : []),
  ]
}

/**
 * Extract the child key from a selection point path, given the path of the
 * enclosing block. Returns undefined when the point is on the block itself
 * (no child component).
 */
function childKeyInsideBlock(
  pointPath: Path,
  blockPath: Path,
): string | undefined {
  if (pointPath.length <= blockPath.length) {
    return undefined
  }

  const childSegment = pointPath.at(-1)

  if (!isKeyedSegment(childSegment)) {
    return undefined
  }

  return childSegment._key
}
