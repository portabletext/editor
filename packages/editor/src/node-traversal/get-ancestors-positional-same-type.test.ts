import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {defineContainer} from '../renderers/renderer.types'
import {buildPublicContainers} from '../schema/build-public-containers'
import {resolveNestedContainer} from '../schema/resolve-containers-batch'
import type {Node} from '../slate/interfaces/node'
import {getAncestors} from './get-ancestors'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Regression: `getAncestors` must descend with positional awareness
 * so the same `_type` registered under two different parents with
 * different `childField` values resolves correctly at each position.
 *
 * Mirrors the schema used by `get-children-positional-same-type.test.ts`:
 * - `table.rows.of: [{cell, content}]`
 * - `diagram.shapes.of: [{cell, markers}]`
 *
 * If `getAncestors` lost positional awareness, it would try to descend
 * into the wrong field on the wrong-shape cell and return an empty
 * ancestor list at depths greater than 1.
 */
describe('getAncestors with same _type under different parents', () => {
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

  const tableSpan = {_key: 'ts', _type: 'span', text: 'in table'}
  const tableTextBlock = {
    _key: 'tc-tb',
    _type: 'block',
    children: [tableSpan],
  }
  const tableCell = {_key: 'tc', _type: 'cell', content: [tableTextBlock]}
  const tableNode = {_key: 't1', _type: 'table', rows: [tableCell]}

  const diagramSpan = {_key: 'ds', _type: 'span', text: 'in diagram'}
  const diagramTextBlock = {
    _key: 'dc-tb',
    _type: 'block',
    children: [diagramSpan],
  }
  const diagramCell = {
    _key: 'dc',
    _type: 'cell',
    markers: [diagramTextBlock],
  }
  const diagramNode = {_key: 'd1', _type: 'diagram', shapes: [diagramCell]}

  const value: Array<Node> = [tableNode as Node, diagramNode as Node]
  const blockIndexMap = new Map<string, number>([
    [tableNode._key, 0],
    [diagramNode._key, 1],
  ])

  const snapshot: TraversalSnapshot = {
    context: {schema, containers, value},
    blockIndexMap,
  }

  test('span path inside table.cell.content resolves all three ancestors', () => {
    const ancestors = getAncestors(snapshot, [
      {_key: 't1'},
      'rows',
      {_key: 'tc'},
      'content',
      {_key: 'tc-tb'},
      'children',
      {_key: 'ts'},
    ])
    expect(ancestors.map((a) => a.node)).toEqual([
      tableTextBlock,
      tableCell,
      tableNode,
    ])
  })

  test('span path inside diagram.cell.markers resolves all three ancestors', () => {
    const ancestors = getAncestors(snapshot, [
      {_key: 'd1'},
      'shapes',
      {_key: 'dc'},
      'markers',
      {_key: 'dc-tb'},
      'children',
      {_key: 'ds'},
    ])
    expect(ancestors.map((a) => a.node)).toEqual([
      diagramTextBlock,
      diagramCell,
      diagramNode,
    ])
  })
})
