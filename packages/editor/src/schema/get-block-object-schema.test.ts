import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import type {Container, ContainerConfig} from '../renderers/renderer.types'
import {getBlockObjectSchema} from './get-block-object-schema'
import {makeContainerConfig} from './make-container-config'
import {resolveContainers} from './resolve-containers'

const testRender: Container['render'] = ({children}) => children

describe(getBlockObjectSchema.name, () => {
  test('returns a root-level block-object definition when block is at the document root', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'image',
            fields: [{name: 'src', type: 'string'}],
          },
        ],
      }),
    )
    const context = {schema, containers: new Map(), value: []}
    const node = {_type: 'image', _key: 'i0', src: 'foo.png'}

    const result = getBlockObjectSchema(context, node, [{_key: 'i0'}])

    expect(result?.name).toBe('image')
    expect(result?.fields).toEqual([{name: 'src', type: 'string'}])
  })

  test('returns an inline-declared type definition when block is inside a container', () => {
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
                    type: 'row',
                    fields: [
                      {
                        name: 'cells',
                        type: 'array',
                        of: [
                          {
                            type: 'cell',
                            fields: [
                              {
                                name: 'content',
                                type: 'array',
                                of: [{type: 'block'}],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    )

    const containerConfigs: Map<string, ContainerConfig> = new Map()
    containerConfigs.set(
      '$..table',
      makeContainerConfig(schema, {
        scope: '$..table',
        field: 'rows',
        render: testRender,
      }),
    )
    containerConfigs.set(
      '$..table.row',
      makeContainerConfig(schema, {
        scope: '$..table.row',
        field: 'cells',
        render: testRender,
      }),
    )
    const containers = resolveContainers(schema, containerConfigs)

    const value = [
      {
        _type: 'table',
        _key: 't0',
        rows: [
          {
            _type: 'row',
            _key: 'r0',
            cells: [
              {
                _type: 'cell',
                _key: 'c0',
                content: [],
              },
            ],
          },
        ],
      },
    ]
    const context = {schema, containers, value}

    // Look up the `row` block-object schema (inline-declared under table.rows.of)
    const rowNode = {_type: 'row', _key: 'r0', cells: []}
    const rowResult = getBlockObjectSchema(context, rowNode, [
      {_key: 't0'},
      'rows',
      {_key: 'r0'},
    ])

    expect(rowResult?.name).toBe('row')

    // Look up the `cell` block-object schema (inline-declared under row.cells.of)
    const cellNode = {_type: 'cell', _key: 'c0', content: []}
    const cellResult = getBlockObjectSchema(context, cellNode, [
      {_key: 't0'},
      'rows',
      {_key: 'r0'},
      'cells',
      {_key: 'c0'},
    ])

    expect(cellResult?.name).toBe('cell')
  })

  test('falls back to root-level blockObjects when no inline match is found', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'image',
            fields: [{name: 'src', type: 'string'}],
          },
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}],
              },
            ],
          },
        ],
      }),
    )
    const containerConfigs: Map<string, ContainerConfig> = new Map()
    containerConfigs.set(
      '$..callout',
      makeContainerConfig(schema, {
        scope: '$..callout',
        field: 'content',
        render: testRender,
      }),
    )
    const containers = resolveContainers(schema, containerConfigs)

    const context = {schema, containers, value: []}
    // `image` is in root `blockObjects` but not inline-declared inside callout.
    // Looking it up at a callout-internal position falls back to root.
    const imageNode = {_type: 'image', _key: 'i0', src: 'foo.png'}
    const result = getBlockObjectSchema(context, imageNode, [
      {_key: 'co0'},
      'content',
      {_key: 'i0'},
    ])

    expect(result?.name).toBe('image')
  })

  test('returns undefined when the type is unknown at the effective scope', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    )
    const context = {schema, containers: new Map(), value: []}
    const node = {_type: 'unknown', _key: 'u0'}

    expect(getBlockObjectSchema(context, node, [{_key: 'u0'}])).toBeUndefined()
  })
})
