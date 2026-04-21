import {isSpan, isTextBlock, type PortableTextBlock} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import {getAncestorTextBlock} from '../node-traversal/get-ancestor-text-block'
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

  let startBlock: PortableTextBlock | undefined
  const middleBlocks: PortableTextBlock[] = []
  let endBlock: PortableTextBlock | undefined

  const startPoint = getSelectionStartPoint(context.selection)
  const endPoint = getSelectionEndPoint(context.selection)

  if (!startPoint || !endPoint) {
    return slice
  }

  const startBlockKey = resolveBlockKey(context, startPoint.path)
  const endBlockKey = resolveBlockKey(context, endPoint.path)
  const startChildSegment = startPoint.path.at(-1)
  const endChildSegment = endPoint.path.at(-1)
  const startChildKey = isKeyedSegment(startChildSegment)
    ? startChildSegment._key
    : undefined
  const endChildKey = isKeyedSegment(endChildSegment)
    ? endChildSegment._key
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

            if (block._key === endBlockKey && startChildKey === endChildKey) {
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

  const parsedStartBlock = startBlock
    ? parseBlock({
        context: {
          schema: context.schema,
          keyGenerator: context.keyGenerator ?? defaultKeyGenerator,
        },
        block: startBlock,
        options: {
          normalize: false,
          removeUnusedMarkDefs: true,
          validateFields: false,
        },
      })
    : undefined

  const parsedEndBlock = endBlock
    ? parseBlock({
        context: {
          schema: context.schema,
          keyGenerator: context.keyGenerator ?? defaultKeyGenerator,
        },
        block: endBlock,
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

function resolveBlockKey(
  context: Pick<EditorContext, 'schema' | 'value' | 'containers'>,
  path: Path,
): string | undefined {
  // Walk up the path to the nearest text block (or, for a path on a block
  // object, the block object itself). Inside an editable container this
  // returns the container-internal text block key; at root level the
  // innermost keyed segment IS the block key.
  const textBlock = getAncestorTextBlock(context, path)
  if (textBlock) {
    const lastSegment = textBlock.path.at(-1)
    if (isKeyedSegment(lastSegment)) {
      return lastSegment._key
    }
  }

  // Block objects: their selection points are [{_key: block}] with no
  // enclosing text block ancestor. Fall back to the first keyed segment.
  const firstSegment = path.at(0)
  if (isKeyedSegment(firstSegment)) {
    return firstSegment._key
  }

  return undefined
}
