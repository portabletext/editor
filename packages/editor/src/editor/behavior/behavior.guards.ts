import {
  isPortableTextListBlock,
  type PortableTextBlock,
  type PortableTextListBlock,
} from '@sanity/types'
import type {PortableTextMemberSchemaTypes} from '../../types/editor'

/**
 * @alpha
 */
export type BehaviorGuards = ReturnType<typeof createGuards>

export function createGuards({
  schema,
}: {
  schema: PortableTextMemberSchemaTypes
}) {
  function isListBlock(
    block: PortableTextBlock,
  ): block is PortableTextListBlock {
    return isPortableTextListBlock(block) && block._type === schema.block.name
  }

  return {isListBlock}
}
