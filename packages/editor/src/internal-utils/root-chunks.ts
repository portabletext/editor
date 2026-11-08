import type {Node} from '../engine/interfaces/node'
import type {EngineOperation} from '../engine/interfaces/operation'
import {serializePath} from '../paths/serialize-path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

export type RootChunk = {
  id: string
  blocks: Array<Node>
}

const TARGET_CHUNK_SIZE = 100
const MAX_CHUNK_SIZE = 200
const MIN_CHUNK_SIZE = 50

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

export function reconcileChildChunks(
  chunks: Array<RootChunk>,
  value: ReadonlyArray<Node>,
): Array<RootChunk> {
  const previous = chunks.flatMap((chunk) => chunk.blocks)
  let prefixLength = 0
  while (
    prefixLength < previous.length &&
    prefixLength < value.length &&
    previous[prefixLength] === value[prefixLength]
  ) {
    prefixLength++
  }
  if (prefixLength === previous.length && prefixLength === value.length) {
    return chunks
  }

  let suffixLength = 0
  while (
    suffixLength < previous.length - prefixLength &&
    suffixLength < value.length - prefixLength &&
    previous[previous.length - suffixLength - 1] ===
      value[value.length - suffixLength - 1]
  ) {
    suffixLength++
  }

  let start = 0
  let firstChunkIndex = 0
  while (
    firstChunkIndex < chunks.length - 1 &&
    prefixLength >= start + chunks[firstChunkIndex]!.blocks.length
  ) {
    start += chunks[firstChunkIndex]!.blocks.length
    firstChunkIndex++
  }
  if (
    firstChunkIndex > 0 &&
    prefixLength === start &&
    suffixLength >= previous.length - start
  ) {
    firstChunkIndex--
    start -= chunks[firstChunkIndex]!.blocks.length
  }

  let previousEnd = previous.length
  let lastChunkIndex = chunks.length - 1
  while (
    lastChunkIndex > firstChunkIndex &&
    previous.length - suffixLength <=
      previousEnd - chunks[lastChunkIndex]!.blocks.length
  ) {
    previousEnd -= chunks[lastChunkIndex]!.blocks.length
    lastChunkIndex--
  }

  const unchangedAfter = previous.length - previousEnd
  const replacement = value.slice(start, value.length - unchangedAfter)
  const replacementChunks: Array<RootChunk> = []
  const replacementChunkSize =
    replacement.length <= MAX_CHUNK_SIZE
      ? MAX_CHUNK_SIZE
      : replacement.length <= MAX_CHUNK_SIZE * 2
        ? Math.ceil(replacement.length / 2)
        : TARGET_CHUNK_SIZE
  for (
    let replacementStart = 0;
    replacementStart < replacement.length;
    replacementStart += replacementChunkSize
  ) {
    const blocks = replacement.slice(
      replacementStart,
      replacementStart + replacementChunkSize,
    ) as Array<Node>
    const previousId =
      replacementStart === 0 ? chunks[firstChunkIndex]?.id : undefined
    replacementChunks.push(
      previousId === undefined ? createChunk(blocks) : {id: previousId, blocks},
    )
  }

  const result = chunks.slice(0, firstChunkIndex)
  result.push(...replacementChunks, ...chunks.slice(lastChunkIndex + 1))
  if (replacementChunks.length === 0) {
    compactChunkAt(result, Math.min(firstChunkIndex, result.length - 1))
  } else {
    const replacementIds = new Set(replacementChunks.map((chunk) => chunk.id))
    for (let index = 0; index < result.length; index++) {
      if (replacementIds.has(result[index]!.id)) {
        compactChunkAt(result, index)
      }
    }
  }
  return result
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
 * this before `transformBlockIndexMap`). The map and the key scan only
 * nominate the owning root index: a matching key does not prove which
 * sibling the operation changed (keys can be duplicated mid-batch), so
 * the nominee is accepted only when `afterValue` shows the change there
 * (the replaced reference, the inserted node, or the removed slot).
 * Otherwise the chunks are reconciled against `afterValue`, and
 * unresolvable shapes fall back to a full rebuild. Either way
 * `flatten(chunks)` holds exactly the blocks of `afterValue`. The oracle
 * test in `root-chunks.test.ts` pins that and the identity reuse of
 * untouched chunks.
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

  if (!changeConfirmedAt(chunks, operation, beforeIndex, delta, afterValue)) {
    return reconcileChildChunks(chunks, afterValue)
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
    result.splice(ownerIndex, 1)
    return result
  }

  if (newBlocks.length > MAX_CHUNK_SIZE) {
    const half = Math.ceil(newBlocks.length / 2)
    result.splice(
      ownerIndex,
      1,
      {id: owner.id, blocks: newBlocks.slice(0, half)},
      createChunk(newBlocks.slice(half)),
    )
    return result
  }

  result[ownerIndex] = {id: owner.id, blocks: newBlocks}
  if (delta === -1) {
    compactChunkAt(result, ownerIndex)
  }
  return result
}

/**
 * Whether `afterValue` shows the operation's change at the nominated root
 * index. Only an operation that changed the nominated sibling replaces
 * its reference (nested edits, replacement), puts the inserted node at
 * the insert slot, or closes the gap at the removed slot.
 */
function changeConfirmedAt(
  chunks: Array<RootChunk>,
  operation: Exclude<EngineOperation, {type: 'set.selection'}>,
  index: number,
  delta: number,
  afterValue: ReadonlyArray<Node>,
): boolean {
  let beforeLength = 0
  for (const chunk of chunks) {
    beforeLength += chunk.blocks.length
  }
  if (afterValue.length !== beforeLength + delta) {
    return false
  }

  if (delta === 0) {
    return (
      index < beforeLength && afterValue[index] !== blockAtIndex(chunks, index)
    )
  }

  if (delta === 1) {
    const slot =
      operation.type === 'insert' && operation.position === 'after'
        ? index + 1
        : index
    return (
      slot <= beforeLength &&
      operation.type === 'insert' &&
      afterValue[slot] === operation.node
    )
  }

  // Removal. Adjacent blocks sharing one reference would make a removal
  // elsewhere look like this one, so that case is not confirmable.
  if (index >= beforeLength) {
    return false
  }
  const removed = blockAtIndex(chunks, index)
  const previous = index > 0 ? blockAtIndex(chunks, index - 1) : undefined
  const next = blockAtIndex(chunks, index + 1)
  if (removed === next || (index > 0 && removed === previous)) {
    return false
  }
  return (
    (index === 0 || afterValue[index - 1] === previous) &&
    (index + 1 === beforeLength || afterValue[index] === next)
  )
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
      if (chunk.blocks[blockIndex]?._key === key) {
        return start + blockIndex
      }
    }
    start += chunk.blocks.length
  }
  return undefined
}

function compactChunkAt(chunks: Array<RootChunk>, index: number): void {
  const chunk = chunks[index]
  if (!chunk || chunk.blocks.length > MIN_CHUNK_SIZE || chunks.length === 1) {
    return
  }
  const neighborIndex = index === chunks.length - 1 ? index - 1 : index + 1
  const neighbor = chunks[neighborIndex]!
  if (chunk.blocks.length + neighbor.blocks.length > MAX_CHUNK_SIZE) {
    return
  }
  const firstIndex = Math.min(index, neighborIndex)
  const first = chunks[firstIndex]!
  const second = chunks[firstIndex + 1]!
  chunks.splice(firstIndex, 2, {
    id: first.id,
    blocks: [...first.blocks, ...second.blocks],
  })
}
