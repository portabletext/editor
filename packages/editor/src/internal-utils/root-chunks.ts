import type {Node} from '../engine/interfaces/node'
import type {EngineOperation} from '../engine/interfaces/operation'
import {serializePath} from '../paths/serialize-path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * A contiguous slice of the root value array, rendered as one memoized
 * fragment so a change to one block reconciles one chunk's children
 * instead of the whole document's. The object identity is the render
 * contract: `transformRootChunks` replaces the chunk object whose
 * blocks changed and reuses every other chunk object untouched, so the
 * chunk component's `React.memo` bails on `prev.chunk === next.chunk`.
 */
export type RootChunk = {
  id: string
  blocks: Array<Node>
}

const TARGET_CHUNK_SIZE = 100
const MAX_CHUNK_SIZE = 200

let nextChunkId = 0

function createChunk(blocks: Array<Node>): RootChunk {
  nextChunkId++
  return {id: `chunk-${nextChunkId}`, blocks}
}

export function buildRootChunks(value: ReadonlyArray<Node>): Array<RootChunk> {
  const chunks: Array<RootChunk> = []
  for (let start = 0; start < value.length; start += TARGET_CHUNK_SIZE) {
    chunks.push(createChunk(value.slice(start, start + TARGET_CHUNK_SIZE)))
  }
  return chunks
}

/**
 * Apply an editor operation's effect on the root value array to the
 * chunk list. Pure w.r.t. inputs: given chunks whose flattened blocks
 * equal the value before `operation` and the value after it, returns a
 * chunk list whose flattened blocks equal `afterValue`, rebuilding only
 * the chunk that owns the operation's root position. Every op except
 * `set.selection` replaces the owning root block's reference (the tree
 * is updated immutably), so the owning chunk is refreshed even for text
 * ops.
 *
 * `beforeIndexMap` must reflect the value before the operation (call
 * this before `transformBlockIndexMap`); a miss falls back to scanning
 * the chunks, and unresolvable shapes fall back to a full rebuild, so
 * an unmaintained map only costs performance, never correctness. The
 * oracle test in `root-chunks.test.ts` pins `flatten(chunks) ===
 * value` and the identity reuse of untouched chunks.
 */
export function transformRootChunks(
  chunks: Array<RootChunk>,
  operation: EngineOperation,
  beforeIndexMap: ReadonlyMap<string, number>,
  afterValue: ReadonlyArray<Node>,
): Array<RootChunk> {
  if (operation.type === 'set.selection') {
    return chunks
  }

  const path = operation.path

  if (path.length === 0) {
    // Whole-value set/unset.
    return buildRootChunks(afterValue)
  }

  const rootSegment = path[0]
  let beforeIndex: number | undefined

  if (typeof rootSegment === 'number') {
    beforeIndex = rootSegment
  } else if (isKeyedSegment(rootSegment)) {
    const mappedIndex = beforeIndexMap.get(serializePath([rootSegment]))
    if (
      mappedIndex !== undefined &&
      blockAtIndex(chunks, mappedIndex)?._key === rootSegment._key
    ) {
      beforeIndex = mappedIndex
    } else {
      // The map can miss or disagree with the chunks (unmaintained or
      // stale maps); fall back to scanning the chunks, mirroring
      // `getNode`/`getChildren`.
      beforeIndex = indexOfKeyInChunks(chunks, rootSegment._key)
    }
  }

  if (beforeIndex === undefined || beforeIndex < 0) {
    return buildRootChunks(afterValue)
  }

  // The root-membership delta this operation applied: a root-level
  // insert adds one block, a root-level node removal removes one,
  // everything else (nested edits, text ops, node replacement,
  // re-keying) keeps the length and only replaces the owning block's
  // reference.
  const lastSegment = path[path.length - 1]
  const delta =
    operation.type === 'insert' && path.length === 1
      ? 1
      : operation.type === 'unset' &&
          path.length === 1 &&
          (isKeyedSegment(lastSegment) || typeof lastSegment === 'number')
        ? -1
        : 0

  // Locate the owning chunk by walking prefix sums of the before-state
  // spans. For inserts the anchor's chunk receives the new block
  // ('before' inserts at the anchor's index, 'after' appends behind
  // it), so ownership by before-index is correct for every delta.
  let start = 0
  let ownerIndex = -1
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const length = chunks[chunkIndex]!.blocks.length
    if (beforeIndex < start + length) {
      ownerIndex = chunkIndex
      break
    }
    start += length
  }

  if (ownerIndex === -1) {
    if (delta === 1 && chunks.length > 0) {
      // Out-of-range insert anchors clamp to an append; the last chunk
      // owns it.
      ownerIndex = chunks.length - 1
      start -= chunks[ownerIndex]!.blocks.length
    } else {
      return buildRootChunks(afterValue)
    }
  }

  const owner = chunks[ownerIndex]!
  const newLength = owner.blocks.length + delta
  const newBlocks = afterValue.slice(start, start + newLength) as Array<Node>

  const result = chunks.slice()

  if (newBlocks.length === 0) {
    // ponytail: chunks split but never merge, so scattered deletions can
    // accumulate small chunks and degrade the root dispatch toward O(n)
    // in the pathological limit. Merge-with-neighbor below a floor is
    // the upgrade if chunk counts ever show up in a profile.
    result.splice(ownerIndex, 1)
    return result
  }

  if (newBlocks.length > MAX_CHUNK_SIZE) {
    const half = Math.ceil(newBlocks.length / 2)
    result.splice(
      ownerIndex,
      1,
      createChunk(newBlocks.slice(0, half)),
      createChunk(newBlocks.slice(half)),
    )
    return result
  }

  result[ownerIndex] = {id: owner.id, blocks: newBlocks}
  return result
}

function blockAtIndex(
  chunks: Array<RootChunk>,
  index: number,
): Node | undefined {
  let start = 0
  for (const chunk of chunks) {
    if (index < start + chunk.blocks.length) {
      return chunk.blocks[index - start]
    }
    start += chunk.blocks.length
  }
  return undefined
}

function indexOfKeyInChunks(
  chunks: Array<RootChunk>,
  key: string,
): number | undefined {
  let start = 0
  for (const chunk of chunks) {
    for (let blockIndex = 0; blockIndex < chunk.blocks.length; blockIndex++) {
      if (chunk.blocks[blockIndex]!._key === key) {
        return start + blockIndex
      }
    }
    start += chunk.blocks.length
  }
  return undefined
}
