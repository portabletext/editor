import {defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {createTestEditor} from '../src/test/vitest'
import {
  findSibling,
  getAncestor,
  getAncestorTextBlock,
  getBlock,
  getChildren,
  getNode,
  getNodes,
  getSibling,
  hasNode,
  isInline,
  type TraversalSnapshot,
} from '../src/traversal'

/**
 * The traversal primitives are public API exposed from
 * `@portabletext/editor/traversal`. Pin the contract that a consumer relies
 * on: they can pass `editor.getSnapshot()` directly to any primitive (because
 * `EditorSnapshot` satisfies `TraversalSnapshot` structurally), paths come
 * back canonical (keyed segments + field names), and the documented
 * semantics hold.
 */
describe('Traversal public API contract', () => {
  test('Scenario: EditorSnapshot satisfies TraversalSnapshot structurally', async () => {
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _key: 'b1',
          _type: 'block',
          children: [{_key: 's1', _type: 'span', text: 'hello', marks: []}],
        },
      ],
    })

    const snapshot = editor.getSnapshot()
    // No cast: assigning the snapshot to TraversalSnapshot must compile.
    const traversalSnapshot: TraversalSnapshot = snapshot
    expect(traversalSnapshot.context.value).toHaveLength(1)
    expect(traversalSnapshot.blockIndexMap).toBeInstanceOf(Map)
  })

  test('Scenario: getNode returns canonical paths for indexed input', async () => {
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _key: 'b1',
          _type: 'block',
          children: [{_key: 's1', _type: 'span', text: 'hello', marks: []}],
        },
      ],
    })

    const snapshot = editor.getSnapshot()
    // Indexed path: [0, 'children', 0]
    const result = getNode(snapshot, [0, 'children', 0])
    expect(result).toBeDefined()
    // Canonical path uses keyed segments + field name, even though input was indexed.
    expect(result?.path).toEqual([{_key: 'b1'}, 'children', {_key: 's1'}])
    expect(result?.node).toEqual({
      _key: 's1',
      _type: 'span',
      text: 'hello',
      marks: [],
    })
  })

  test('Scenario: hasNode discriminates existing vs missing paths', async () => {
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _key: 'b1',
          _type: 'block',
          children: [{_key: 's1', _type: 'span', text: 'hi', marks: []}],
        },
      ],
    })
    const snapshot = editor.getSnapshot()
    expect(hasNode(snapshot, [{_key: 'b1'}])).toBe(true)
    expect(hasNode(snapshot, [{_key: 'b1'}, 'children', {_key: 's1'}])).toBe(
      true,
    )
    expect(hasNode(snapshot, [{_key: 'nonexistent'}])).toBe(false)
  })

  test('Scenario: getChildren returns canonical paths for child entries', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
      }),
      initialValue: [
        {
          _key: 'b1',
          _type: 'block',
          children: [
            {_key: 's1', _type: 'span', text: 'a', marks: ['strong']},
            {_key: 's2', _type: 'span', text: 'b', marks: ['em']},
          ],
        },
      ],
    })

    const snapshot = editor.getSnapshot()
    const children = getChildren(snapshot, [{_key: 'b1'}])
    expect(children).toHaveLength(2)
    expect(children[0]?.path).toEqual([{_key: 'b1'}, 'children', {_key: 's1'}])
    expect(children[1]?.path).toEqual([{_key: 'b1'}, 'children', {_key: 's2'}])
  })

  test('Scenario: getNodes traverses an inclusive range in document order', async () => {
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _key: 'b1',
          _type: 'block',
          children: [{_key: 's1', _type: 'span', text: 'a', marks: []}],
        },
        {
          _key: 'b2',
          _type: 'block',
          children: [{_key: 's2', _type: 'span', text: 'b', marks: []}],
        },
        {
          _key: 'b3',
          _type: 'block',
          children: [{_key: 's3', _type: 'span', text: 'c', marks: []}],
        },
      ],
    })

    const snapshot = editor.getSnapshot()
    const visited: Array<string> = []
    for (const entry of getNodes(snapshot, {
      from: [{_key: 'b1'}],
      to: [{_key: 'b3'}],
    })) {
      if ('_key' in entry.node) {
        visited.push(entry.node._key as string)
      }
    }
    // Inclusive endpoints, document-order DFS. Visits nodes whose paths fall
    // between `from` and `to` (inclusive) in document order. The `to` path
    // itself is yielded but not descended into.
    expect(visited).toEqual(['b1', 's1', 'b2', 's2', 'b3'])
  })

  test('Scenario: getAncestor returns the deepest matching ancestor', async () => {
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _key: 'b1',
          _type: 'block',
          children: [{_key: 's1', _type: 'span', text: 'hi', marks: []}],
        },
      ],
    })

    const snapshot = editor.getSnapshot()
    // From the span, the only ancestor is the text block. getAncestor
    // returns the FIRST (deepest) match, which is the immediate parent.
    const ancestor = getAncestor(
      snapshot,
      [{_key: 'b1'}, 'children', {_key: 's1'}],
      (node) => node._type === 'block',
    )
    expect(ancestor?.path).toEqual([{_key: 'b1'}])
  })

  test('Scenario: getSibling walks siblings in a direction', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}, {name: 'underline'}],
      }),
      initialValue: [
        {
          _key: 'b1',
          _type: 'block',
          children: [
            {_key: 's1', _type: 'span', text: 'a', marks: ['strong']},
            {_key: 's2', _type: 'span', text: 'b', marks: ['em']},
            {_key: 's3', _type: 'span', text: 'c', marks: ['underline']},
          ],
        },
      ],
    })

    const snapshot = editor.getSnapshot()
    const path = [{_key: 'b1'}, 'children', {_key: 's2'}]
    const next = getSibling(snapshot, path, 'next')
    const previous = getSibling(snapshot, path, 'previous')
    expect(next?.node._key).toBe('s3')
    expect(previous?.node._key).toBe('s1')
  })

  test('Scenario: findSibling walks siblings until a predicate matches', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}, {name: 'underline'}],
      }),
      initialValue: [
        {
          _key: 'b1',
          _type: 'block',
          children: [
            {_key: 's1', _type: 'span', text: 'a', marks: ['strong']},
            {_key: 's2', _type: 'span', text: 'b', marks: ['em']},
            {_key: 's3', _type: 'span', text: 'c', marks: ['underline']},
          ],
        },
      ],
    })

    const snapshot = editor.getSnapshot()
    const result = findSibling(
      snapshot,
      [{_key: 'b1'}, 'children', {_key: 's1'}],
      'next',
      ({node}) =>
        node._type === 'span' && (node as {_key: string})._key === 's3',
    )
    expect(result?.node._key).toBe('s3')
  })

  test('Scenario: isInline discriminates spans and inline-objects from blocks', async () => {
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _key: 'b1',
          _type: 'block',
          children: [{_key: 's1', _type: 'span', text: 'a', marks: []}],
        },
      ],
    })

    const snapshot = editor.getSnapshot()
    expect(isInline(snapshot, [{_key: 'b1'}, 'children', {_key: 's1'}])).toBe(
      true,
    )
    expect(isInline(snapshot, [{_key: 'b1'}])).toBe(false)
  })

  test('Scenario: getBlock narrows to a typed block entry', async () => {
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _key: 'b1',
          _type: 'block',
          children: [{_key: 's1', _type: 'span', text: 'a', marks: []}],
        },
      ],
    })

    const snapshot = editor.getSnapshot()
    const block = getBlock(snapshot, [{_key: 'b1'}])
    expect(block?.node._type).toBe('block')
    // A span path is not a block.
    const span = getBlock(snapshot, [{_key: 'b1'}, 'children', {_key: 's1'}])
    expect(span).toBeUndefined()
  })

  test('Scenario: getAncestorTextBlock walks up to the nearest text block', async () => {
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _key: 'b1',
          _type: 'block',
          children: [{_key: 's1', _type: 'span', text: 'a', marks: []}],
        },
      ],
    })

    const snapshot = editor.getSnapshot()
    const ancestor = getAncestorTextBlock(snapshot, [
      {_key: 'b1'},
      'children',
      {_key: 's1'},
    ])
    expect(ancestor?.path).toEqual([{_key: 'b1'}])
    expect(ancestor?.node._key).toBe('b1')
  })

  test('Scenario: works with a custom schema declaration', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
      }),
      initialValue: [
        {
          _key: 'b1',
          _type: 'block',
          style: 'h1',
          children: [{_key: 's1', _type: 'span', text: 'heading', marks: []}],
        },
      ],
    })

    const snapshot = editor.getSnapshot()
    const block = getBlock(snapshot, [{_key: 'b1'}])
    expect(block?.node).toMatchObject({
      _type: 'block',
      style: 'h1',
    })
  })
})
