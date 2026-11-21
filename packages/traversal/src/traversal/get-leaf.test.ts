import {compileSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {
  textBlockDepthsContainers,
  textBlockDepthsSchemaDefinition,
} from '../../test-utils/text-block-depths'
import {getLeaf} from './get-leaf'
import {createNodeTraversalTestbed} from './node-traversal-testbed'
import {resolveTestbedContainers} from './node-traversal-testbed'

describe(getLeaf.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('first leaf from root (start edge)', () => {
    const entry = getLeaf(testbed.snapshot, [], {edge: 'start'})
    expect(entry?.node).toBe(testbed.span1)
    expect(entry?.path).toEqual([{_key: 'k3'}, 'children', {_key: 'k0'}])
  })

  test('last leaf from root (end edge)', () => {
    const entry = getLeaf(testbed.snapshot, [], {edge: 'end'})
    expect(entry?.node).toBe(testbed.emptySpan)
    expect(entry?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k25'},
      'cells',
      {_key: 'k24'},
      'content',
      {_key: 'k23'},
      'children',
      {_key: 'k22'},
    ])
  })

  test('first leaf from text block', () => {
    const entry = getLeaf(testbed.snapshot, [{_key: 'k3'}], {edge: 'start'})
    expect(entry?.node).toBe(testbed.span1)
    expect(entry?.path).toEqual([{_key: 'k3'}, 'children', {_key: 'k0'}])
  })

  test('last leaf from text block', () => {
    const entry = getLeaf(testbed.snapshot, [{_key: 'k3'}], {edge: 'end'})
    expect(entry?.node).toBe(testbed.span2)
    expect(entry?.path).toEqual([{_key: 'k3'}, 'children', {_key: 'k2'}])
  })

  test('span is already a leaf', () => {
    const entry = getLeaf(
      testbed.snapshot,
      [{_key: 'k3'}, 'children', {_key: 'k0'}],
      {edge: 'start'},
    )
    expect(entry?.node).toBe(testbed.span1)
    expect(entry?.path).toEqual([{_key: 'k3'}, 'children', {_key: 'k0'}])
  })

  test('void block object is a leaf', () => {
    const entry = getLeaf(testbed.snapshot, [{_key: 'k4'}], {edge: 'start'})
    expect(entry?.node).toBe(testbed.image)
    expect(entry?.path).toEqual([{_key: 'k4'}])
  })

  test('inline object is a leaf', () => {
    const entry = getLeaf(
      testbed.snapshot,
      [{_key: 'k3'}, 'children', {_key: 'k1'}],
      {edge: 'start'},
    )
    expect(entry?.node).toBe(testbed.stockTicker1)
    expect(entry?.path).toEqual([{_key: 'k3'}, 'children', {_key: 'k1'}])
  })

  test('empty document returns undefined', () => {
    const emptyContext = {
      ...testbed.snapshot,
      context: {...testbed.snapshot.context, value: []},
    }
    expect(getLeaf(emptyContext, [], {edge: 'start'})).toBeUndefined()
    expect(getLeaf(emptyContext, [], {edge: 'end'})).toBeUndefined()
  })

  test('invalid path returns undefined', () => {
    expect(
      getLeaf(testbed.snapshot, [{_key: 'nonexistent'}], {edge: 'start'}),
    ).toBeUndefined()
    expect(
      getLeaf(
        testbed.snapshot,
        [{_key: 'k3'}, 'children', {_key: 'nonexistent'}],
        {edge: 'end'},
      ),
    ).toBeUndefined()
  })

  test('first leaf from code block', () => {
    const entry = getLeaf(testbed.snapshot, [{_key: 'k11'}], {edge: 'start'})
    expect(entry?.node).toBe(testbed.codeSpan1)
    expect(entry?.path).toEqual([
      {_key: 'k11'},
      'code',
      {_key: 'k8'},
      'children',
      {_key: 'k7'},
    ])
  })

  test('last leaf from code block', () => {
    const entry = getLeaf(testbed.snapshot, [{_key: 'k11'}], {edge: 'end'})
    expect(entry?.node).toBe(testbed.codeSpan2)
    expect(entry?.path).toEqual([
      {_key: 'k11'},
      'code',
      {_key: 'k10'},
      'children',
      {_key: 'k9'},
    ])
  })

  test('first leaf from table', () => {
    const entry = getLeaf(testbed.snapshot, [{_key: 'k26'}], {edge: 'start'})
    expect(entry?.node).toBe(testbed.cellSpan1)
    expect(entry?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
      'content',
      {_key: 'k14'},
      'children',
      {_key: 'k12'},
    ])
  })

  test('last leaf from table', () => {
    const entry = getLeaf(testbed.snapshot, [{_key: 'k26'}], {edge: 'end'})
    expect(entry?.node).toBe(testbed.emptySpan)
    expect(entry?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k25'},
      'cells',
      {_key: 'k24'},
      'content',
      {_key: 'k23'},
      'children',
      {_key: 'k22'},
    ])
  })
})

describe(`${getLeaf.name} with a compact path to a text block`, () => {
  const schema = compileSchema(textBlockDepthsSchemaDefinition)
  const containers = resolveTestbedContainers(schema, textBlockDepthsContainers)

  test('at the root, a compact span path (indexed) returns no leaf', () => {
    const value = [
      {
        _type: 'block',
        _key: 'b0',
        children: [
          {_type: 'span', _key: 's0', text: 'foo', marks: []},
          {_type: 'span', _key: 's1', text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]
    const snapshot = createTestSnapshot({context: {schema, containers, value}})

    expect(getLeaf(snapshot, [0, 0], {edge: 'start'})).toEqual(undefined)
  })

  test('inside a callout, a compact span path (indexed) returns no leaf', () => {
    const value = [
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ]
    const snapshot = createTestSnapshot({context: {schema, containers, value}})

    expect(getLeaf(snapshot, [0, 'content', 0, 0], {edge: 'start'})).toEqual(
      undefined,
    )
  })

  test('inside a callout inside a callout, a compact span path (indexed) returns no leaf', () => {
    const value = [
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [
                  {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  {_type: 'span', _key: 's1', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ]
    const snapshot = createTestSnapshot({context: {schema, containers, value}})

    expect(
      getLeaf(snapshot, [0, 'content', 0, 'content', 0, 0], {edge: 'start'}),
    ).toEqual(undefined)
  })

  test('inside a field with its own sub-schema, a compact span path (indexed) returns no leaf', () => {
    const value = [
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ]
    const snapshot = createTestSnapshot({context: {schema, containers, value}})

    expect(getLeaf(snapshot, [0, 'body', 0, 0], {edge: 'start'})).toEqual(
      undefined,
    )
  })
})
