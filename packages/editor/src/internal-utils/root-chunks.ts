import type {Node} from '../engine/interfaces/node'

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
