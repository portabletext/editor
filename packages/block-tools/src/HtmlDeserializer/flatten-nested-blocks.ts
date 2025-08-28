import type {Schema} from '@portabletext/schema'
import {
  isSpan,
  isTextBlock,
  type PortableTextBlock,
  type PortableTextObject,
  type PortableTextSpan,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {isEqual} from 'lodash'
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
          isEqual(splitChildren[0].children, block.children)
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

function getSplitChildren(
  context: {schema: Schema},
  block: PortableTextTextBlock,
) {
  return block.children.reduce(
    (slices, child) => {
      const knownInlineObject = context.schema.inlineObjects.some(
        (inlineObject) => inlineObject.name === child._type,
      )
      const knownBlockObject = context.schema.blockObjects.some(
        (blockObject) => blockObject.name === child._type,
      )

      const lastSlice = slices.pop()

      if (!isSpan(context, child) && !knownInlineObject) {
        if (knownBlockObject) {
          return [
            ...slices,
            ...(lastSlice ? [lastSlice] : []),
            {type: 'block object' as const, block: child},
          ]
        }
      }

      if (child._type === '__block') {
        return [
          ...slices,
          ...(lastSlice ? [lastSlice] : []),
          {
            type: 'block object' as const,
            block: (child as any).block,
          },
        ]
      }

      if (child._type === 'block') {
        return [
          ...slices,
          ...(lastSlice ? [lastSlice] : []),
          {type: 'block' as const, block: child},
        ]
      }

      if (lastSlice) {
        if (lastSlice.type === 'children') {
          return [
            ...slices,
            {
              type: 'children' as const,
              children: [...lastSlice.children, child],
            },
          ]
        }
      }

      return [
        ...slices,
        ...(lastSlice ? [lastSlice] : []),
        {type: 'children' as const, children: [child]},
      ]
    },
    [] as Array<
      | {
          type: 'children'
          children: Array<PortableTextSpan | PortableTextObject>
        }
      | {type: 'block object'; block: PortableTextObject}
      | {type: 'block'; block: PortableTextBlock}
    >,
  )
}
