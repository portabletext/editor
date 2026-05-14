import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {defineContainer} from '../renderers/renderer.types'
import {buildPublicContainers} from '../schema/build-public-containers'
import {resolveNestedContainer} from '../schema/resolve-containers-batch'
import type {Node} from '../slate/interfaces/node'
import {getChildren} from './get-children'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Regression: when the SAME `_type` is registered under two
 * different parents with DIFFERENT `childField` values, descent
 * helpers must resolve the position-specific entry. Flat lookup by
 * bare `_type` would silently pick the wrong field and return `[]`
 * for nodes at the loser position.
 *
 * Schema configuration:
 * - `table` registers `cell` in its `of` with `childField:
 *   'content'`.
 * - `diagram` registers `cell` in its `of` with `childField:
 *   'markers'`.
 *
 * Two cells, two different fields, no top-level `cell` registration.
 */
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

  function containerRender() {
    return null
  }

  const tableConfig = resolveNestedContainer(
    schema,
    defineContainer({
      type: 'table',
      childField: 'rows',
      render: containerRender,
      of: [
        defineContainer({
          type: 'cell',
          childField: 'content',
          render: containerRender,
        }),
      ],
    }),
  )
  const diagramConfig = resolveNestedContainer(
    schema,
    defineContainer({
      type: 'diagram',
      childField: 'shapes',
      render: containerRender,
      of: [
        defineContainer({
          type: 'cell',
          childField: 'markers',
          render: containerRender,
        }),
      ],
    }),
  )
  if (!tableConfig || !diagramConfig) {
    throw new Error('failed to resolve test configs')
  }
  const containers = buildPublicContainers(
    new Map([
      ['table', tableConfig],
      ['diagram', diagramConfig],
    ]),
  )

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

  const blockIndexMap = new Map<string, number>([
    [tableNode._key, 0],
    [diagramNode._key, 1],
  ])

  const snapshot: TraversalSnapshot = {
    context: {
      schema,
      containers,
      value,
    },
    blockIndexMap,
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
