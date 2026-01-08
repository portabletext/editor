import type {Schema} from '@portabletext/schema'
import {
  isSpan,
  isTextBlock,
  type PortableTextBlock,
  type PortableTextObject,
  type PortableTextSpan,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {isDeepEqual} from '../equality'
import {
  isArbitraryTypedObject,
  type ArbitraryTypedObject,
  type TypedObject,
} from '../types'

export function flattenNestedBlocks(
  context: {
    schema: Schema
  },
  blocks: Array<ArbitraryTypedObject>,
): TypedObject[] {
  const flattened = blocks.flatMap((block) => {
    if (isBlockContainer(block)) {
      return flattenNestedBlocks(context, [block.block])
    }

    if (isTextBlock(context, block)) {
      const hasBlockObjects = block.children.some((child) => {
        const knownBlockObject = context.schema.blockObjects.some(
          (blockObject) => blockObject.name === child._type,
        )
        return knownBlockObject
      })
      const hasBlocks = block.children.some(
        (child) => child._type === '__block' || child._type === 'block',
      )

      if (hasBlockObjects || hasBlocks) {
        const splitChildren = getSplitChildren(context, block)

        if (
          splitChildren.length === 1 &&
          splitChildren[0].type === 'children' &&
          isDeepEqual(splitChildren[0].children, block.children)
        ) {
          return [block]
        }

        return splitChildren.flatMap((slice) => {
          if (slice.type === 'block object') {
            return [slice.block]
          }

          if (slice.type === 'block') {
            return flattenNestedBlocks(context, [
              slice.block as ArbitraryTypedObject,
            ])
          }

          if (slice.children.length > 0) {
            if (
              slice.children.every(
                (child) => isSpan(context, child) && child.text.trim() === '',
              )
            ) {
              return []
            }

            return flattenNestedBlocks(context, [
              {
                ...block,
                children: slice.children,
              },
            ])
          }

          return []
        })
      }

      return [block]
    }

    return [block]
  })

  return flattened
}

function isBlockContainer(
  block: ArbitraryTypedObject,
): block is BlockContainer {
  return block._type === '__block' && isArbitraryTypedObject(block.block)
}

type BlockContainer = {
  _type: '__block'
  block: ArbitraryTypedObject
}

type ChildSlice =
  | {
      type: 'children'
      children: Array<PortableTextSpan | PortableTextObject>
    }
  | {type: 'block object'; block: PortableTextObject}
  | {type: 'block'; block: PortableTextBlock}

function getSplitChildren(
  context: {schema: Schema},
  block: PortableTextTextBlock,
): Array<ChildSlice> {
  const slices: Array<ChildSlice> = []

  for (const child of block.children) {
    const knownInlineObject = context.schema.inlineObjects.some(
      (inlineObject) => inlineObject.name === child._type,
    )
    const knownBlockObject = context.schema.blockObjects.some(
      (blockObject) => blockObject.name === child._type,
    )

    if (!isSpan(context, child) && !knownInlineObject) {
      if (knownBlockObject) {
        slices.push({type: 'block object' as const, block: child})
        continue
      }
    }

    if (child._type === '__block') {
      slices.push({
        type: 'block object' as const,
        block: (child as any).block,
      })
      continue
    }

    if (child._type === 'block') {
      slices.push({type: 'block' as const, block: child})
      continue
    }

    const lastSlice = slices[slices.length - 1]

    if (lastSlice && lastSlice.type === 'children') {
      // Append to existing children slice
      lastSlice.children.push(child)
    } else {
      // Create new children slice
      slices.push({type: 'children' as const, children: [child]})
    }
  }

  return slices
}
