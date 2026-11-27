import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {buildIndexMaps} from './build-index-maps'
import {compileContainers} from './compile-containers'
import {getChildren} from './get-children'
import type {Node} from './node'
import type {TraversalSnapshot} from './traversal-snapshot'

describe('getChildren with same _type registered under different parents', () => {
  const schema = compileSchema(
    defineSchema({
      blockObjects: [
        {
          name: 'table',
          fields: [
            {
              name: 'rows',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'cell',
                  fields: [
                    {name: 'content', type: 'array', of: [{type: 'block'}]},
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'diagram',
          fields: [
            {
              name: 'shapes',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'cell',
                  fields: [
                    {name: 'markers', type: 'array', of: [{type: 'block'}]},
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
  )

  const containers = compileContainers(schema, [
    {
      kind: 'container',
      type: 'table',
      arrayField: 'rows',
      of: [{kind: 'container', type: 'cell', arrayField: 'content'}],
    },
    {
      kind: 'container',
      type: 'diagram',
      arrayField: 'shapes',
      of: [{kind: 'container', type: 'cell', arrayField: 'markers'}],
    },
  ])

  const tableCellTextBlock = {
    _key: 'tc-tb',
    _type: 'block',
    children: [{_key: 'tc-s', _type: 'span', text: 'in table'}],
  }
  const tableCell = {
    _key: 'tc',
    _type: 'cell',
    content: [tableCellTextBlock],
  }
  const tableNode = {
    _key: 't1',
    _type: 'table',
    rows: [tableCell],
  }

  const diagramCellTextBlock = {
    _key: 'dc-tb',
    _type: 'block',
    children: [{_key: 'dc-s', _type: 'span', text: 'in diagram'}],
  }
  const diagramCell = {
    _key: 'dc',
    _type: 'cell',
    markers: [diagramCellTextBlock],
  }
  const diagramNode = {
    _key: 'd1',
    _type: 'diagram',
    shapes: [diagramCell],
  }

  const value: Array<Node> = [tableNode as Node, diagramNode as Node]

  const indexMap = new Map<string, number>()
  buildIndexMaps({schema, containers, value}, {indexMap})

  const snapshot: TraversalSnapshot = {
    context: {
      schema,
      containers,
      value,
    },
    indexMap,
  }

  test('getChildren of cell inside table resolves content array', () => {
    const result = getChildren(snapshot, [{_key: 't1'}, 'rows', {_key: 'tc'}])
    expect(result).toHaveLength(1)
    expect(result[0]?.node).toBe(tableCellTextBlock)
    expect(result[0]?.path).toEqual([
      {_key: 't1'},
      'rows',
      {_key: 'tc'},
      'content',
      {_key: 'tc-tb'},
    ])
  })

  test('getChildren of cell inside diagram resolves markers array', () => {
    const result = getChildren(snapshot, [{_key: 'd1'}, 'shapes', {_key: 'dc'}])
    expect(result).toHaveLength(1)
    expect(result[0]?.node).toBe(diagramCellTextBlock)
    expect(result[0]?.path).toEqual([
      {_key: 'd1'},
      'shapes',
      {_key: 'dc'},
      'markers',
      {_key: 'dc-tb'},
    ])
  })
})

describe('getChildren with a block object declared where its type is a top-level container', () => {
  const schema = compileSchema(
    defineSchema({
      blockObjects: [
        {
          name: 'image',
          fields: [{name: 'caption', type: 'array', of: [{type: 'block'}]}],
        },
        {
          name: 'callout',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'image',
                  fields: [
                    {name: 'caption', type: 'array', of: [{type: 'block'}]},
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
  )
  const containers = compileContainers(schema, [
    {kind: 'container', type: 'image', arrayField: 'caption'},
    {
      kind: 'container',
      type: 'callout',
      arrayField: 'content',
      of: [{kind: 'blockObject', type: 'image'}],
    },
  ])
  const keyGenerator = createTestKeyGenerator()
  const imageKey = keyGenerator()
  const imageBlockKey = keyGenerator()
  const imageSpanKey = keyGenerator()
  const calloutKey = keyGenerator()
  const calloutImageKey = keyGenerator()
  const calloutImageBlockKey = keyGenerator()
  const calloutImageSpanKey = keyGenerator()
  const imageBlock = {
    _key: imageBlockKey,
    _type: 'block',
    children: [{_key: imageSpanKey, _type: 'span', text: 'foo'}],
  }
  const snapshot: TraversalSnapshot = {
    context: {
      schema,
      containers,
      value: [
        {_key: imageKey, _type: 'image', caption: [imageBlock]},
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            {
              _key: calloutImageKey,
              _type: 'image',
              caption: [
                {
                  _key: calloutImageBlockKey,
                  _type: 'block',
                  children: [
                    {_key: calloutImageSpanKey, _type: 'span', text: 'bar'},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  }

  test('getChildren of the top-level image resolves its caption', () => {
    expect(getChildren(snapshot, [{_key: imageKey}])).toEqual([
      {
        node: imageBlock,
        path: [{_key: imageKey}, 'caption', {_key: imageBlockKey}],
      },
    ])
  })

  test('getChildren of the image inside the callout returns no children', () => {
    expect(
      getChildren(snapshot, [
        {_key: calloutKey},
        'content',
        {_key: calloutImageKey},
      ]),
    ).toEqual([])
  })
})
