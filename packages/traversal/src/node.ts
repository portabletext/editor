// Keep in sync with `packages/editor/src/engine/interfaces/node.ts`.
import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'

/**
 * @public
 */
export type Node = PortableTextTextBlock | PortableTextObject | PortableTextSpan
