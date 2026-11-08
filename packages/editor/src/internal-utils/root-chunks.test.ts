import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import type {Node} from '../engine/interfaces/node'
import type {EngineOperation} from '../engine/interfaces/operation'
import {serializePath} from '../paths/serialize-path'
import {
  buildRootChunks,
  reconcileChildChunks,
  transformRootChunks,
  type RootChunk,
} from './root-chunks'

type TestBlock = Node & {children: Array<Node>}

function flatten(chunks: Array<RootChunk>): Array<Node> {
  return chunks.flatMap((chunk) => chunk.blocks)
}

function indexMapOf(value: Array<Node>): Map<string, number> {
  const map = new Map<string, number>()
  for (let index = 0; index < value.length; index++) {
    const key = value[index]!._key
    if (key !== undefined) {
      map.set(serializePath([{_key: key}]), index)
    }
  }
  return map
}

function block(keyGenerator: () => string, text?: string): TestBlock {
  const key = keyGenerator()
  return {
    _type: 'block',
    _key: key,
    children: [
      {_type: 'span', _key: keyGenerator(), text: text ?? key, marks: []},
    ],
    markDefs: [],
    style: 'normal',
  } as unknown as TestBlock
}

function makeValue(
  count: number,
  keyGenerator: () => string,
): Array<TestBlock> {
  return Array.from({length: count}, () => block(keyGenerator))
}

describe(reconcileChildChunks.name, () => {
  test('returns the same chunks when every block reference is unchanged', () => {
    const keyGenerator = createTestKeyGenerator()
    const chunks = buildRootChunks(makeValue(250, keyGenerator))

    expect(reconcileChildChunks(chunks, flatten(chunks))).toBe(chunks)
  })

  test('reconciles a changed range and preserves surrounding chunks', () => {
    const keyGenerator = createTestKeyGenerator()
    const value = makeValue(350, keyGenerator)
    const chunks = buildRootChunks(value)
    const nextValue = value.slice()
    nextValue.splice(150, 1, block(keyGenerator))

    const next = reconcileChildChunks(chunks, nextValue)

    expect(flatten(next)).toEqual(nextValue)
    expect(next[0]).toBe(chunks[0])
    expect(next[2]).toBe(chunks[2])
    expect(next[3]).toBe(chunks[3])
    expect(next[1]!.id).toBe(chunks[1]!.id)
  })

  test('splits and compacts chunks without changing the first chunk id', () => {
    const keyGenerator = createTestKeyGenerator()
    const value = makeValue(200, keyGenerator)
    const chunks = buildRootChunks(value)
    const insertedValue = [
      ...value.slice(0, 100),
      ...makeValue(101, keyGenerator),
      ...value.slice(100),
    ]

    const split = reconcileChildChunks(chunks, insertedValue)

    expect(flatten(split)).toEqual(insertedValue)
    expect(split.map((chunk) => chunk.blocks.length)).toEqual([101, 100, 100])
    expect(split[0]!.id).toBe(chunks[0]!.id)
    expect(split[2]).toBe(chunks[1])

    const compacted = reconcileChildChunks(split, value)

    expect(flatten(compacted)).toEqual(value)
    expect(compacted.map((chunk) => chunk.blocks.length)).toEqual([100, 100])
    expect(compacted[0]!.id).toBe(chunks[0]!.id)
    expect(compacted[1]).toBe(chunks[1])
  })

  test('reconciles empty and newly populated child arrays', () => {
    const keyGenerator = createTestKeyGenerator()
    const value = makeValue(3, keyGenerator)
    const populated = reconcileChildChunks([], value)

    expect(flatten(populated)).toEqual(value)
    expect(populated.map((chunk) => chunk.blocks.length)).toEqual([3])
    expect(reconcileChildChunks(populated, [])).toEqual([])
  })
})

describe(transformRootChunks.name, () => {
  test('Scenario: A text op replaces only the owning chunk object', () => {
    const keyGenerator = createTestKeyGenerator()
    const value = makeValue(250, keyGenerator)
    const chunks = buildRootChunks(value)
    expect(chunks.map((chunk) => chunk.blocks.length)).toEqual([100, 100, 50])

    // A text edit replaces the root block ref at index 150 (chunk 1).
    const afterValue = value.slice()
    const target = value[150]!
    afterValue[150] = {
      ...target,
      children: [{...target.children![0]!, text: 'edited'}],
    }
    const operation: EngineOperation = {
      type: 'insert.text',
      path: [
        {_key: target._key as string},
        'children',
        {_key: target.children![0]!._key as string},
      ],
      offset: 0,
      text: 'x',
    }

    const next = transformRootChunks(
      chunks,
      operation,
      indexMapOf(value),
      afterValue,
    )

    expect(flatten(next)).toEqual(afterValue)
    expect(next[0]).toBe(chunks[0])
    expect(next[2]).toBe(chunks[2])
    expect(next[1]).not.toBe(chunks[1])
    expect(next[1]!.id).toBe(chunks[1]!.id)
  })

  test('Scenario: Root inserts and removals shift only the owning chunk', () => {
    const keyGenerator = createTestKeyGenerator()
    const value = makeValue(250, keyGenerator)
    const chunks = buildRootChunks(value)

    // Insert after b120 (chunk 1).
    const inserted = block(keyGenerator)
    const afterInsert = value.slice()
    afterInsert.splice(121, 0, inserted)
    const insertOp: EngineOperation = {
      type: 'insert',
      path: [{_key: value[120]!._key as string}],
      position: 'after',
      node: inserted,
    }
    const afterInsertChunks = transformRootChunks(
      chunks,
      insertOp,
      indexMapOf(value),
      afterInsert,
    )
    expect(flatten(afterInsertChunks)).toEqual(afterInsert)
    expect(afterInsertChunks[0]).toBe(chunks[0])
    expect(afterInsertChunks[2]).toBe(chunks[2])
    expect(afterInsertChunks[1]!.blocks.length).toBe(101)

    // Remove b0 (chunk 0).
    const afterRemove = afterInsert.slice(1)
    const removeOp: EngineOperation = {
      type: 'unset',
      path: [{_key: afterInsert[0]!._key as string}],
    }
    const afterRemoveChunks = transformRootChunks(
      afterInsertChunks,
      removeOp,
      indexMapOf(afterInsert),
      afterRemove,
    )
    expect(flatten(afterRemoveChunks)).toEqual(afterRemove)
    expect(afterRemoveChunks[1]).toBe(afterInsertChunks[1])
    expect(afterRemoveChunks[2]).toBe(afterInsertChunks[2])
    expect(afterRemoveChunks[0]!.blocks.length).toBe(99)
  })

  test('Scenario: A chunk splits when it outgrows the max size', () => {
    const keyGenerator = createTestKeyGenerator()
    let value = makeValue(150, keyGenerator)
    let chunks: Array<RootChunk> = [{id: keyGenerator(), blocks: value.slice()}]

    for (let extra = 0; extra < 60; extra++) {
      const inserted = block(keyGenerator)
      const afterValue = value.slice()
      afterValue.splice(75, 0, inserted)
      chunks = transformRootChunks(
        chunks,
        {
          type: 'insert',
          path: [{_key: value[74]!._key as string}],
          position: 'after',
          node: inserted,
        },
        indexMapOf(value),
        afterValue,
      )
      value = afterValue
      expect(flatten(chunks)).toEqual(value)
    }

    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk.blocks.length).toBeLessThanOrEqual(200)
    }
  })

  test('Scenario: Removing a chunk\u2019s last block drops the chunk', () => {
    const keyGenerator = createTestKeyGenerator()
    const value = [block(keyGenerator), block(keyGenerator)]
    const firstChunkId = keyGenerator()
    const secondChunkId = keyGenerator()
    const chunks = [
      {id: firstChunkId, blocks: [value[0]!]},
      {id: secondChunkId, blocks: [value[1]!]},
    ] satisfies Array<RootChunk>

    const afterValue = [value[0]!]
    const next = transformRootChunks(
      chunks,
      {type: 'unset', path: [{_key: value[1]!._key as string}]},
      indexMapOf(value),
      afterValue,
    )
    expect(next).toEqual([{id: firstChunkId, blocks: [value[0]!]}])
    expect(next[0]).toBe(chunks[0])
  })

  test('Scenario: Fuzzed op sequence keeps chunks equal to the value', () => {
    const keyGenerator = createTestKeyGenerator()
    let value = makeValue(120, keyGenerator)
    let chunks = buildRootChunks(value)
    let seed = 42

    const random = () => {
      // Park-Miller PRNG, deterministic across runs.
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }

    for (let step = 0; step < 400; step++) {
      const kind = random()
      const index = Math.floor(random() * value.length)
      const target = value[index]
      const beforeIndexMap = indexMapOf(value)

      let operation: EngineOperation
      let afterValue: Array<TestBlock>

      if (kind < 0.3 && target) {
        // Root insert before/after a random anchor.
        const inserted = block(keyGenerator)
        const after = random() < 0.5
        afterValue = value.slice()
        afterValue.splice(after ? index + 1 : index, 0, inserted)
        operation = {
          type: 'insert',
          path: [{_key: target._key as string}],
          position: after ? 'after' : 'before',
          node: inserted,
        }
      } else if (kind < 0.55 && target && value.length > 1) {
        // Root removal.
        afterValue = value.slice()
        afterValue.splice(index, 1)
        operation = {type: 'unset', path: [{_key: target._key as string}]}
      } else if (kind < 0.75 && target) {
        // Whole-node replacement at the same position.
        const replacement = block(keyGenerator)
        afterValue = value.slice()
        afterValue[index] = replacement
        operation = {
          type: 'set',
          path: [{_key: target._key as string}],
          value: replacement,
        }
      } else if (kind < 0.95 && target) {
        // Nested edit: the root block ref is replaced in place.
        const edited = {
          ...target,
          children: [{...target.children![0]!, text: `edited-${step}`}],
        }
        afterValue = value.slice()
        afterValue[index] = edited
        operation = {
          type: 'insert.text',
          path: [
            {_key: target._key as string},
            'children',
            {_key: target.children![0]!._key as string},
          ],
          offset: 0,
          text: 'x',
        }
      } else {
        // Whole-value replacement.
        afterValue = makeValue(Math.floor(random() * 150), keyGenerator)
        operation = {type: 'set', path: [], value: afterValue}
      }

      chunks = transformRootChunks(
        chunks,
        operation,
        beforeIndexMap,
        afterValue,
      )
      value = afterValue

      expect(flatten(chunks), `step ${step}`).toEqual(value)
    }
  })

  test('Scenario: Map miss falls back to scanning the chunks', () => {
    const keyGenerator = createTestKeyGenerator()
    const value = makeValue(10, keyGenerator)
    const chunks = buildRootChunks(value)
    const afterValue = value.slice()
    afterValue.splice(5, 1)

    const next = transformRootChunks(
      chunks,
      {type: 'unset', path: [{_key: value[5]!._key as string}]},
      new Map(),
      afterValue,
    )
    expect(flatten(next)).toEqual(afterValue)
  })

  test('Scenario: Numeric root path', () => {
    const keyGenerator = createTestKeyGenerator()
    const value = makeValue(10, keyGenerator)
    const chunks = buildRootChunks(value)
    const afterValue = value.slice()
    afterValue.splice(3, 1)

    const next = transformRootChunks(
      chunks,
      {type: 'unset', path: [3]},
      indexMapOf(value),
      afterValue,
    )
    expect(flatten(next)).toEqual(afterValue)
  })
})
