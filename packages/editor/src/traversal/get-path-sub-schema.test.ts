import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {defineContainer, type Container} from '../renderers/renderer.types'
import {resolveContainers} from '../schema/resolve-containers'
import {getPathSubSchema} from './get-path-sub-schema'

const testRender: Container['render'] = ({children}) => children

describe(getPathSubSchema.name, () => {
  test('returns root sub-schema when path is at root', () => {
    const schema = compileSchema(
      defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
        annotations: [{name: 'link'}],
        styles: [{name: 'h1'}],
      }),
    )

    const context = {
      context: {
        schema,
        containers: new Map(),
        value: [{_type: 'block', _key: 'b0', children: []}],
      },
      blockIndexMap: new Map(),
    }

    const subSchema = getPathSubSchema(context, [{_key: 'b0'}])

    expect(subSchema.decorators.map((d) => d.name)).toEqual(['strong', 'em'])
    expect(subSchema.styles.map((s) => s.name)).toEqual(['normal', 'h1'])
    expect(subSchema.annotations.map((a) => a.name)).toEqual(['link'])
  })

  test('returns nested sub-schema inside a registered container', () => {
    const schema = compileSchema(
      defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
        styles: [{name: 'h1'}],
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
                    name: 'row',
                    fields: [
                      {
                        name: 'cells',
                        type: 'array',
                        of: [
                          {
                            type: 'object',
                            name: 'cell',
                            fields: [
                              {
                                name: 'content',
                                type: 'array',
                                of: [
                                  {
                                    type: 'block',
                                    decorators: [{name: 'strong'}],
                                    styles: [{name: 'monospace'}],
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
          },
        ],
      }),
    )

    const containers = resolveContainers(schema, [
      defineContainer({
        type: 'table',
        childField: 'rows',
        render: testRender,
      }),
      defineContainer({
        type: 'row',
        childField: 'cells',
        render: testRender,
      }),
      defineContainer({
        type: 'cell',
        childField: 'content',
        render: testRender,
      }),
    ])

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
                content: [{_type: 'block', _key: 'b0', children: []}],
              },
            ],
          },
        ],
      },
    ]
    const context = {
      context: {schema, containers, value},
      blockIndexMap: new Map(),
    }

    const subSchema = getPathSubSchema(context, [
      {_key: 't0'},
      'rows',
      {_key: 'r0'},
      'cells',
      {_key: 'c0'},
      'content',
      {_key: 'b0'},
    ])

    expect(subSchema.decorators.map((d) => d.name)).toEqual(['strong'])
  })
})
