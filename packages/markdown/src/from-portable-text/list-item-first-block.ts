import type {PortableTextBlock} from '@portabletext/types'

/**
 * Blocks currently known to be a list item's first content block: it shares
 * its first line with the list marker (and, for a task item, its GFM
 * checkbox), which changes how `renderBlock` plans line-start hazard
 * escaping. Internal to this package so the signal never reaches the
 * public `Serializable`/`RenderNode` types a custom renderer's `.d.ts`
 * would otherwise expose it through.
 *
 * A block is marked right before rendering it; the `renderNode` call that
 * dispatches to `renderBlock` consumes the membership on the way past so a
 * later, unrelated render of the same object (still possible - `renderNode`
 * accepts any `TypedObject`) doesn't inherit a stale claim.
 */
const listItemFirstBlocks = new WeakSet<PortableTextBlock>()

export function markListItemFirstBlock(block: PortableTextBlock): void {
  listItemFirstBlocks.add(block)
}

export function consumeListItemFirstBlock(block: PortableTextBlock): boolean {
  const isListItemFirstBlock = listItemFirstBlocks.has(block)
  listItemFirstBlocks.delete(block)
  return isListItemFirstBlock
}
