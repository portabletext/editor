import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import type {Node} from '../engine/interfaces/node'
import {buildChunks, reconcileChildChunks, type Chunk} from './chunks'

type TestBlock = Node & {children: Array<Node>}

function flatten(chunks: Array<Chunk>): Array<Node> {
  return chunks.flatMap((chunk) => chunk.blocks)
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
    const chunks = buildChunks(makeValue(250, keyGenerator))

    expect(reconcileChildChunks(chunks, flatten(chunks))).toBe(chunks)
  })

  test('reconciles a changed range and preserves surrounding chunks', () => {
    const keyGenerator = createTestKeyGenerator()
    const value = makeValue(350, keyGenerator)
    const chunks = buildChunks(value)
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
    const chunks = buildChunks(value)
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
