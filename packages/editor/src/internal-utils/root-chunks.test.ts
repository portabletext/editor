import {describe, expect, test} from 'vitest'
import type {Node} from '../engine/interfaces/node'
import type {EngineOperation} from '../engine/interfaces/operation'
import {serializePath} from '../paths/serialize-path'
import {
  buildRootChunks,
  transformRootChunks,
  type RootChunk,
} from './root-chunks'

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

function block(key: string, text = key): Node {
  return {
    _type: 'block',
    _key: key,
    children: [{_type: 'span', _key: `${key}-s`, text, marks: []}],
    markDefs: [],
    style: 'normal',
  } as unknown as Node
}

function makeValue(count: number): Array<Node> {
  return Array.from({length: count}, (_, index) => block(`b${index}`))
}

describe(transformRootChunks.name, () => {
  test('Scenario: A text op replaces only the owning chunk object', () => {
    const value = makeValue(250)
    const chunks = buildRootChunks(value)
    expect(chunks.map((chunk) => chunk.blocks.length)).toEqual([100, 100, 50])

    // A text edit replaces the root block ref at index 150 (chunk 1).
    const afterValue = value.slice()
    afterValue[150] = block('b150', 'edited')
    const operation: EngineOperation = {
      type: 'insert.text',
      path: [{_key: 'b150'}, 'children', {_key: 'b150-s'}],
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
    const value = makeValue(250)
    const chunks = buildRootChunks(value)

    // Insert after b120 (chunk 1).
    const inserted = block('new1')
    const afterInsert = value.slice()
    afterInsert.splice(121, 0, inserted)
    const insertOp: EngineOperation = {
      type: 'insert',
      path: [{_key: 'b120'}],
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
      path: [{_key: 'b0'}],
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
    let value = makeValue(150)
    let chunks = [
      {id: 'single', blocks: value.slice()},
    ] satisfies Array<RootChunk>

    for (let extra = 0; extra < 60; extra++) {
      const inserted = block(`extra${extra}`)
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
    const value = [block('a'), block('b')]
    const chunks = [
      {id: 'c1', blocks: [value[0]!]},
      {id: 'c2', blocks: [value[1]!]},
    ] satisfies Array<RootChunk>

    const afterValue = [value[0]!]
    const next = transformRootChunks(
      chunks,
      {type: 'unset', path: [{_key: 'b'}]},
      indexMapOf(value),
      afterValue,
    )
    expect(next).toEqual([{id: 'c1', blocks: [value[0]!]}])
    expect(next[0]).toBe(chunks[0])
  })

  test('Scenario: Fuzzed op sequence keeps chunks equal to the value', () => {
    let value = makeValue(120)
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
      let afterValue: Array<Node>

      if (kind < 0.3 && target) {
        // Root insert before/after a random anchor.
        const inserted = block(`f${step}`)
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
        const replacement = block(`r${step}`)
        afterValue = value.slice()
        afterValue[index] = replacement
        operation = {
          type: 'set',
          path: [{_key: target._key as string}],
          value: replacement,
        }
      } else if (kind < 0.95 && target) {
        // Nested edit: the root block ref is replaced in place.
        const edited = block(target._key as string, `edited-${step}`)
        afterValue = value.slice()
        afterValue[index] = edited
        operation = {
          type: 'insert.text',
          path: [{_key: target._key as string}, 'children', {_key: 'x'}],
          offset: 0,
          text: 'x',
        }
      } else {
        // Whole-value replacement.
        afterValue = makeValue(Math.floor(random() * 150))
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
    const value = makeValue(10)
    const chunks = buildRootChunks(value)
    const afterValue = value.slice()
    afterValue.splice(5, 1)

    const next = transformRootChunks(
      chunks,
      {type: 'unset', path: [{_key: 'b5'}]},
      new Map(),
      afterValue,
    )
    expect(flatten(next)).toEqual(afterValue)
  })

  test('Scenario: Numeric root path', () => {
    const value = makeValue(10)
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
