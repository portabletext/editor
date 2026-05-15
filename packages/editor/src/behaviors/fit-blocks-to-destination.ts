import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import {getRootAcceptedTypes} from '../schema/get-root-accepted-types'
import {getSelectionStartBlock} from '../selectors/selector.get-selection-start-block'
import {getPathSubSchema} from '../traversal/get-path-sub-schema'

/**
 * Reshape an incoming `Array<PortableTextBlock>` so its top-level types
 * are all accepted at the current selection's destination.
 *
 * Used by the paste/drop pipeline at the
 * `deserialization.success → insert.blocks` handoff to filter and
 * descend payloads that would otherwise no-op or land malformed.
 *
 * Strategy:
 *
 * - **Direct.** If a block's `_type` is accepted at the destination,
 *   keep it as-is.
 * - **Descend.** If a block's `_type` isn't accepted but the block is
 *   a container, recurse into each of its array-valued fields and
 *   harvest any descendants whose `_type` is accepted.
 * - **Skip.** Otherwise drop the block.
 *
 * The destination is derived from the snapshot's selection: the
 * sub-schema view that applies at the focus block's path is the
 * accept-list. For an empty editor or a snapshot with no selection,
 * the fragment is returned unchanged - the downstream
 * `operation.insert.block` will validate against the root schema and
 * no-op invalid blocks.
 *
 * @internal
 */
export function fitBlocksToDestination(
  snapshot: EditorSnapshot,
  blocks: ReadonlyArray<PortableTextBlock>,
): Array<PortableTextBlock> {
  if (blocks.length === 0) {
    return []
  }

  const startBlock = getSelectionStartBlock(snapshot)

  if (!startBlock) {
    return [...blocks]
  }

  const subSchema = getPathSubSchema(snapshot, startBlock.path)
  const accepted = getRootAcceptedTypes(subSchema)

  if (accepted.size === 0) {
    return []
  }

  const result: Array<PortableTextBlock> = []

  for (const block of blocks) {
    fitOne(block, accepted, result)
  }

  return result
}

function fitOne(
  block: PortableTextBlock,
  accepted: Set<string>,
  out: Array<PortableTextBlock>,
): void {
  if (accepted.has(block._type)) {
    out.push(block)
    return
  }

  // Descend: walk every array-valued field on the block, looking for
  // accepted-type descendants. A block can have multiple child arrays
  // (e.g. a `table` with `rows`, a `row` with `cells`), so iterate
  // every own property whose value is an array.
  for (const value of Object.values(block as Record<string, unknown>)) {
    if (!Array.isArray(value)) {
      continue
    }
    for (const child of value) {
      if (isBlockLike(child)) {
        fitOne(child, accepted, out)
      }
    }
  }
}

function isBlockLike(value: unknown): value is PortableTextBlock {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_type' in value &&
    typeof (value as Record<string, unknown>)['_type'] === 'string'
  )
}
