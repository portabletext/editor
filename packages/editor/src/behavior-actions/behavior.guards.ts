import {
  isPortableTextListBlock,
  isPortableTextTextBlock,
  type PortableTextListBlock,
  type PortableTextTextBlock,
} from '@sanity/types'
import type {EditorSchema} from '../editor/define-schema'

/**
 * @alpha
 */
export type BehaviorGuards = ReturnType<typeof createGuards>

export function createGuards({schema}: {schema: EditorSchema}) {
  function isListBlock(block: unknown): block is PortableTextListBlock {
    return isPortableTextListBlock(block) && block._type === schema.block.name
  }

  function isTextBlock(block: unknown): block is PortableTextTextBlock {
    return isPortableTextTextBlock(block) && block._type === schema.block.name
  }

  return {isListBlock, isTextBlock}
}
