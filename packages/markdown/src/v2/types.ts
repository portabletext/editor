import type {PortableTextBlock, PortableTextObject} from '@portabletext/schema'

/**
 * Public option type for `markdownToPortableTextV2` and `portableTextToMarkdownV2`.
 *
 * Stub for the spike. Will grow with the `nodes` map and matcher hooks once the
 * core round-trip lands.
 *
 * @internal
 */
export interface MarkdownV2Options {
  keyGenerator?: () => string
}

/**
 * The Portable Text node kinds v2 produces and consumes. v2 emits PT directly;
 * there is no intermediate AST. This type just re-exposes the relevant PT
 * shapes for ergonomic imports across the parse/print layers.
 *
 * @internal
 */
export type PtNode = PortableTextBlock | PortableTextObject
