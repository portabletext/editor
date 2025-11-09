import {isContainerBlock, isSpan, isTextBlock} from '@portabletext/schema'
import type {PortableTextBlock} from '@sanity/types'
import type {EditorContext} from '../editor/editor-snapshot'
import {defaultKeyGenerator} from './key-generator'
import {parseBlock} from './parse-blocks'
import {getSelectionEndPoint} from './util.get-selection-end-point'
import {getSelectionStartPoint} from './util.get-selection-start-point'
import {isKeyedSegment} from './util.is-keyed-segment'
import {getChildKeyFromSelectionPoint} from './util.selection-point'

/**
 * Finds all block keys in a selection point path (for nested selections)
 * Excludes the last keyed segment if it follows 'children' (which would be a span/child)
 */
function getAllBlockKeys(path: Array<any>): string[] {
  const keys: string[] = []
  for (let i = 0; i < path.length; i++) {
    const segment = path[i]
    if (isKeyedSegment(segment)) {
      // Check if this is followed by 'children' - if so, it's a block
      // If it's the last keyed segment and comes after 'children', it's a span/child
      const nextSegment = path[i + 1]
      const prevSegment = path[i - 1]

      // Include if:
      // - It's followed by 'children' (it's a container block)
      // - OR it's not preceded by 'children' (it's a top-level block)
      if (nextSegment === 'children' || prevSegment !== 'children') {
        keys.push(segment._key)
      }
    }
  }
  return keys
}

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

  const startPoint = getSelectionStartPoint(context.selection)
  const endPoint = getSelectionEndPoint(context.selection)

  // Get all block keys in the path (for nested blocks)
  const startBlockKeys = getAllBlockKeys(startPoint.path)
  const endBlockKeys = getAllBlockKeys(endPoint.path)

  const startChildKey = getChildKeyFromSelectionPoint(startPoint)
  const endChildKey = getChildKeyFromSelectionPoint(endPoint)

  if (startBlockKeys.length === 0 || endBlockKeys.length === 0) {
    return slice
  }

  return sliceBlocksRecursive({
    context,
    blocks,
    startBlockKeys,
    startChildKey,
    startPoint,
    endBlockKeys,
    endChildKey,
    endPoint,
  })
}

/**
 * Recursively slices blocks, handling nested container blocks
 */
function sliceBlocksRecursive({
  context,
  blocks,
  startBlockKeys,
  startChildKey,
  startPoint,
  endBlockKeys,
  endChildKey,
  endPoint,
}: {
  context: Pick<EditorContext, 'schema' | 'selection'>
  blocks: Array<PortableTextBlock>
  startBlockKeys: string[]
  startChildKey: string | undefined
  startPoint: {path: Array<any>; offset: number}
  endBlockKeys: string[]
  endChildKey: string | undefined
  endPoint: {path: Array<any>; offset: number}
}): Array<PortableTextBlock> {
  let startBlock: PortableTextBlock | undefined
  const middleBlocks: PortableTextBlock[] = []
  let endBlock: PortableTextBlock | undefined

  // Check if this block is in the selection path
  const isInStartPath = (key: string) => startBlockKeys.includes(key)
  const isInEndPath = (key: string) => endBlockKeys.includes(key)

  for (const block of blocks) {
    // Handle non-text blocks (block objects)
    if (!isTextBlock(context, block)) {
      // If this is a container block, check if it contains blocks or spans
      if (isContainerBlock(context, block)) {
        // Check if this container is in the selection path
        if (isInStartPath(block._key) || isInEndPath(block._key)) {
          // Check if the children are blocks (not spans)
          const firstChild = block.children[0]
          const childrenAreBlocks =
            firstChild && firstChild._type !== context.schema.span.name

          if (childrenAreBlocks) {
            // Container blocks with block children - recursively process
            const slicedChildren = sliceBlocksRecursive({
              context,
              blocks: block.children as Array<PortableTextBlock>,
              startBlockKeys,
              startChildKey,
              startPoint,
              endBlockKeys,
              endChildKey,
              endPoint,
            })

            // If we got sliced children, this container is part of the selection
            if (slicedChildren.length > 0) {
              const slicedContainer = {
                ...block,
                children: slicedChildren,
              }

              // Determine if this is the start, middle, or end block
              if (isInStartPath(block._key) && isInEndPath(block._key)) {
                startBlock = slicedContainer
                break
              } else if (isInStartPath(block._key)) {
                startBlock = slicedContainer
                continue
              } else if (isInEndPath(block._key)) {
                endBlock = slicedContainer
                break
              } else if (startBlock) {
                // This is a middle block
                middleBlocks.push(slicedContainer)
              }
            }
          } else {
            // Container with span children - treat as text block
            // Fall through to text block handling below
          }
        }

        if (!isInStartPath(block._key) && !isInEndPath(block._key)) {
          continue
        }

        // If we reach here and children are spans, fall through to text block handling
        const firstChild = block.children[0]
        if (firstChild && firstChild._type === context.schema.span.name) {
          // Fall through to text block handling
        } else {
          continue
        }
      }

      // Non-container block objects
      if (isInStartPath(block._key) && isInEndPath(block._key)) {
        startBlock = block
        break
      } else if (isInStartPath(block._key)) {
        startBlock = block
        continue
      } else if (isInEndPath(block._key)) {
        endBlock = block
        break
      }
    }

    // Handle text blocks
    if (isInStartPath(block._key)) {
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

            if (isInEndPath(block._key) && startChildKey === endChildKey) {
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
              isInEndPath(block._key) &&
              endChildKey &&
              child._key === endChildKey
            ) {
              break
            }
          }
        }

        if (isInStartPath(block._key) && isInEndPath(block._key)) {
          break
        }

        continue
      }

      startBlock = block

      if (isInStartPath(block._key) && isInEndPath(block._key)) {
        break
      }
    }

    if (isInEndPath(block._key)) {
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
      middleBlocks.push(
        parseBlock({
          context: {
            ...context,
            keyGenerator: defaultKeyGenerator,
          },
          block,
          options: {removeUnusedMarkDefs: true, validateFields: false},
        }) ?? block,
      )
    }
  }

  const parsedStartBlock = startBlock
    ? parseBlock({
        context: {
          ...context,
          keyGenerator: defaultKeyGenerator,
        },
        block: startBlock,
        options: {removeUnusedMarkDefs: true, validateFields: false},
      })
    : undefined

  const parsedEndBlock = endBlock
    ? parseBlock({
        context: {
          ...context,
          keyGenerator: defaultKeyGenerator,
        },
        block: endBlock,
        options: {removeUnusedMarkDefs: true, validateFields: false},
      })
    : undefined

  return [
    ...(parsedStartBlock ? [parsedStartBlock] : []),
    ...middleBlocks,
    ...(parsedEndBlock ? [parsedEndBlock] : []),
  ]
}
