import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import type {EditorSchema} from '../editor/editor-schema'
import type {
  ContainerConfig,
  ContainerDefinition,
} from '../renderers/renderer.types'
import {makeContainerConfig} from './make-container-config'
import type {ChildArrayField, ResolvedContainers} from './resolve-containers'
import {resolveContainerField, resolveContainers} from './resolve-containers'

const testRender: ContainerDefinition['render'] = ({children}) => children

function makeConfigs(
  schema: EditorSchema,
  containers: Array<ContainerDefinition>,
): Map<string, ContainerConfig> {
  const map = new Map<string, ContainerConfig>()
  for (const container of containers) {
    map.set(container.type, makeContainerConfig(schema, container))
  }
  return map
}

/** Extract the `field` shape from a resolved containers map for easier testing. */
function fields(containers: ResolvedContainers): Map<string, ChildArrayField> {
  const out = new Map<string, ChildArrayField>()
  for (const [key, config] of containers) {
    out.set(key, config.field)
  }
  return out
}

describe(resolveContainers.name, () => {
  test('resolves a single-level container', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'code',
            fields: [
              {name: 'content', type: 'array', of: [{type: 'codeLine'}]},
            ],
          },
        ],
      }),
    )

    expect(
      fields(
        resolveContainers(
          schema,
          makeConfigs(schema, [
            {type: 'code', childField: 'content', render: testRender},
          ]),
        ),
      ),
    ).toEqual(
      new Map([
        ['code', {name: 'content', type: 'array', of: [{type: 'codeLine'}]}],
      ]),
    )
  })

  test('resolves inline-declared nested containers by bare _type', () => {
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

    const resolved = fields(
      resolveContainers(
        schema,
        makeConfigs(schema, [
          {type: 'table', childField: 'rows', render: testRender},
          {type: 'row', childField: 'cells', render: testRender},
          {type: 'cell', childField: 'content', render: testRender},
        ]),
      ),
    )

    expect([...resolved.keys()].sort()).toEqual(['cell', 'row', 'table'])
    expect(resolved.get('cell')?.name).toEqual('content')
    expect(resolved.get('row')?.name).toEqual('cells')
    expect(resolved.get('table')?.name).toEqual('rows')
  })

  test('returns empty Map when no containers are registered', () => {
    const schema = compileSchema(defineSchema({}))
    expect(resolveContainers(schema, new Map())).toEqual(new Map())
  })

  test('merges types from multiple container configs', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
          {
            name: 'code',
            fields: [{name: 'lines', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
    )
    expect(
      [
        ...fields(
          resolveContainers(
            schema,
            makeConfigs(schema, [
              {type: 'callout', childField: 'content', render: testRender},
              {type: 'code', childField: 'lines', render: testRender},
            ]),
          ),
        ).keys(),
      ].sort(),
    ).toEqual(['callout', 'code'])
  })

  test('first registration of a given type wins', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {name: 'content', type: 'array', of: [{type: 'block'}]},
              {name: 'sidebar', type: 'array', of: [{type: 'block'}]},
            ],
          },
        ],
      }),
    )
    const map = new Map<string, ContainerConfig>()
    map.set(
      'callout',
      makeContainerConfig(schema, {
        type: 'callout',
        childField: 'content',
        render: testRender,
      }),
    )
    // Second registration on same type is ignored when the Map already has it.
    if (!map.has('callout')) {
      map.set(
        'callout',
        makeContainerConfig(schema, {
          type: 'callout',
          childField: 'sidebar',
          render: testRender,
        }),
      )
    }
    expect(fields(resolveContainers(schema, map)).get('callout')?.name).toEqual(
      'content',
    )
  })
})

describe(resolveContainerField.name, () => {
  test("resolves 'block' to a synthesized children field", () => {
    const schema = compileSchema(defineSchema({}))
    const field = resolveContainerField(schema, 'block', 'children')
    expect(field?.name).toEqual('children')
    expect(field?.type).toEqual('array')
  })

  test("'block' rejects field names other than 'children'", () => {
    const schema = compileSchema(defineSchema({}))
    expect(resolveContainerField(schema, 'block', 'rows')).toBeUndefined()
  })

  test('resolves a top-level container field', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
    )
    expect(resolveContainerField(schema, 'callout', 'content')?.name).toEqual(
      'content',
    )
  })

  test('resolves an inline-declared container field', () => {
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
                    name: 'row',
                    fields: [
                      {name: 'cells', type: 'array', of: [{type: 'cell'}]},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    )
    expect(resolveContainerField(schema, 'row', 'cells')?.name).toEqual('cells')
  })

  test('returns undefined for an unknown type', () => {
    const schema = compileSchema(defineSchema({}))
    expect(resolveContainerField(schema, 'unknown', 'content')).toBeUndefined()
  })

  test('returns undefined for a known type with an unknown field name', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
    )
    expect(resolveContainerField(schema, 'callout', 'rows')).toBeUndefined()
  })

  test('handles self-referential schema without infinite recursion', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'list',
            fields: [
              {
                name: 'items',
                type: 'array',
                of: [{type: 'list-item'}],
              },
            ],
          },
          {
            name: 'list-item',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'list'}],
              },
            ],
          },
        ],
      }),
    )
    expect(resolveContainerField(schema, 'list', 'items')?.name).toEqual(
      'items',
    )
    expect(resolveContainerField(schema, 'list-item', 'content')?.name).toEqual(
      'content',
    )
  })

  test('synthesizes a children field for block with span as its first member', () => {
    const schema = compileSchema(defineSchema({}))
    const field = resolveContainerField(schema, 'block', 'children')
    expect(field).toEqual({
      name: 'children',
      type: 'array',
      of: [{type: 'span'}],
    })
  })
})
