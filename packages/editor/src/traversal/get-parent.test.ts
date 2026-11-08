import {compileSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {
  textBlockDepthsContainers,
  textBlockDepthsSchemaDefinition,
} from '../../test-utils/text-block-depths'
import {getParent} from './get-parent'
import {createNodeTraversalTestbed} from './node-traversal-testbed'
import {resolveTestbedContainers} from './node-traversal-testbed'

describe(getParent.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('parent of top-level block', () => {
    expect(getParent(testbed.snapshot, [{_key: 'k3'}])).toBeUndefined()
  })

  test('parent of span', () => {
    const entry = getParent(testbed.snapshot, [
      {_key: 'k3'},
      'children',
      {_key: 'k0'},
    ])
    expect(entry?.node).toBe(testbed.textBlock1)
    expect(entry?.path).toEqual([{_key: 'k3'}])
  })

  test('parent of row', () => {
    const entry = getParent(testbed.snapshot, [
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
    ])
    expect(entry?.node).toBe(testbed.table)
    expect(entry?.path).toEqual([{_key: 'k26'}])
  })

  test('parent of cell', () => {
    const entry = getParent(testbed.snapshot, [
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
    ])
    expect(entry?.node).toBe(testbed.row1)
    expect(entry?.path).toEqual([{_key: 'k26'}, 'rows', {_key: 'k21'}])
  })

  test('parent of block inside cell', () => {
    const entry = getParent(testbed.snapshot, [
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
      'content',
      {_key: 'k14'},
    ])
    expect(entry?.node).toBe(testbed.cell1)
    expect(entry?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
    ])
  })

  test('parent of span inside cell block', () => {
    const entry = getParent(testbed.snapshot, [
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
    expect(entry?.node).toBe(testbed.cellBlock1)
    expect(entry?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
      'content',
      {_key: 'k14'},
    ])
  })

  test('parent of code line', () => {
    const entry = getParent(testbed.snapshot, [
      {_key: 'k11'},
      'code',
      {_key: 'k8'},
    ])
    expect(entry?.node).toBe(testbed.codeBlock)
    expect(entry?.path).toEqual([{_key: 'k11'}])
  })

  test('empty path returns undefined', () => {
    expect(getParent(testbed.snapshot, [])).toBeUndefined()
  })
})

describe(`${getParent.name} with a compact path to a text block`, () => {
  const schema = compileSchema(textBlockDepthsSchemaDefinition)
  const containers = resolveTestbedContainers(schema, textBlockDepthsContainers)

  test('at the root, a compact span path (indexed) returns no parent', () => {
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

    expect(getParent(snapshot, [0, 0])).toEqual(undefined)
  })

  test('inside a callout, a compact span path (indexed) returns no parent', () => {
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

    expect(getParent(snapshot, [0, 'content', 0, 0])).toEqual(undefined)
  })

  test('inside a callout inside a callout, a compact span path (indexed) returns no parent', () => {
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

    expect(getParent(snapshot, [0, 'content', 0, 'content', 0, 0])).toEqual(
      undefined,
    )
  })

  test('inside a field with its own sub-schema, a compact span path (indexed) returns no parent', () => {
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

    expect(getParent(snapshot, [0, 'body', 0, 0])).toEqual(undefined)
  })
})
