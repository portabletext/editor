import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test, vi} from 'vitest'
import {
  defineContainer,
  defineLeaf,
  type Container,
  type ContainerConfig,
  type Leaf,
} from '../renderers/renderer.types'
import {buildPublicContainers} from './build-public-containers'
import {
  descendToParent,
  resolveContainerByPath,
  resolveContainers,
  resolveContainersRich,
  resolveNestedContainer,
  type ResolvedContainers,
} from './resolve-containers'

const containerRender: Container['render'] = ({children}) => children
const leafRender: Leaf['render'] = ({children}) => children

/**
 * Test snapshots mirror the production shape closely enough for the
 * traversal helpers to descend. Tests use numeric paths via getAncestors;
 * the helpers compose isObjectNode + getAncestors over snapshot.context.
 */
function makeSnapshot(args: {
  schema: ReturnType<typeof compileSchema>
  containers:
    | ReadonlyMap<string, ContainerConfig>
    | ReadonlyMap<
        string,
        {type: string; field: import('./container-types').ChildArrayField}
      >
  value: ReadonlyArray<{_type: string; _key: string; [other: string]: unknown}>
}) {
  // Accept either rich (raw `ContainerConfig` map from `resolveContainersRich`
  // or hand-built fixtures) or already-narrowed `Containers`. Project rich
  // entries through `buildPublicContainers`; pass narrow entries straight
  // through.
  const first = args.containers.values().next().value
  const isAlreadyNarrow =
    first === undefined || !('container' in (first as object))
  const containers = isAlreadyNarrow
    ? (args.containers as import('./container-types').Containers)
    : buildPublicContainers(args.containers as ResolvedContainers)
  return {
    context: {
      schema: args.schema,
      containers,
      value: args.value as never,
    },
    blockIndexMap: new Map(args.value.map((node, index) => [node._key, index])),
  }
}

function makeRichInput(args: {
  schema: ReturnType<typeof compileSchema>
  containers: ResolvedContainers
  value: ReadonlyArray<{_type: string; _key: string; [other: string]: unknown}>
}) {
  return {
    schema: args.schema,
    containers: args.containers,
    value: args.value as never,
  }
}

describe(resolveNestedContainer.name, () => {
  const calloutSchema = compileSchema(
    defineSchema({
      blockObjects: [
        {
          name: 'callout',
          fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
        },
      ],
    }),
  )

  test('pre-resolves a top-level container with no `of` overrides', () => {
    const config = resolveNestedContainer(
      calloutSchema,
      defineContainer({
        type: 'callout',
        childField: 'content',
        render: containerRender,
      }),
    )
    expect(config?.container.type).toEqual('callout')
    expect(config?.field.name).toEqual('content')
    expect(config?.of).toBeUndefined()
  })

  test('pre-resolves nested containers, attaching resolved fields at each level', () => {
    const tableSchema = compileSchema(
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
    const config = resolveNestedContainer(
      tableSchema,
      defineContainer({
        type: 'table',
        childField: 'rows',
        render: containerRender,
        of: [
          defineContainer({
            type: 'row',
            childField: 'cells',
            render: containerRender,
            of: [
              defineContainer({
                type: 'cell',
                childField: 'content',
                render: containerRender,
              }),
            ],
          }),
        ],
      }),
    )
    expect(config?.container.type).toEqual('table')
    expect(config?.field.name).toEqual('rows')
    const rowEntry = config?.of?.[0]
    expect(rowEntry && 'container' in rowEntry).toEqual(true)
    if (!rowEntry || !('container' in rowEntry)) {
      throw new Error('expected row container')
    }
    expect(rowEntry.container.type).toEqual('row')
    expect(rowEntry.field.name).toEqual('cells')
    const cellEntry = rowEntry.of?.[0]
    expect(cellEntry && 'container' in cellEntry).toEqual(true)
    if (!cellEntry || !('container' in cellEntry)) {
      throw new Error('expected cell container')
    }
    expect(cellEntry.container.type).toEqual('cell')
    expect(cellEntry.field.name).toEqual('content')
  })

  test('warns with chain context when a nested registration is unresolvable', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const tableSchema = compileSchema(
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
      const config = resolveNestedContainer(
        tableSchema,
        defineContainer({
          type: 'table',
          childField: 'rows',
          render: containerRender,
          of: [
            defineContainer({
              type: 'row',
              childField: 'cells',
              render: containerRender,
              of: [
                defineContainer({
                  type: 'cell',
                  // intentionally wrong field name
                  childField: 'contents' as 'content',
                  render: containerRender,
                }),
              ],
            }),
          ],
        }),
      )
      // The nested cell is skipped; table + row remain resolved.
      expect(config?.container.type).toEqual('table')
      const rowEntry = config?.of?.[0]
      expect(rowEntry && 'container' in rowEntry).toEqual(true)
      if (!rowEntry || !('container' in rowEntry)) {
        throw new Error('row missing')
      }
      expect(rowEntry.of).toEqual([])
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('(nested inside "table" inside "row")'),
      )
    } finally {
      warnSpy.mockRestore()
    }
  })
})

describe(resolveContainerByPath.name, () => {
  const calloutSchema = compileSchema(
    defineSchema({
      blockObjects: [
        {
          name: 'callout',
          fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
        },
      ],
    }),
  )

  test('6. immediate-parent: finds and matches', () => {
    const containers = resolveContainersRich(calloutSchema, [
      defineContainer({
        type: 'callout',
        childField: 'content',
        render: containerRender,
      }),
    ])
    const richInput = makeRichInput({
      schema: calloutSchema,
      containers,
      value: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
    })
    const result = resolveContainerByPath(
      richInput,
      [{_key: 'c0'}, 'content', {_key: 'b0'}],
      {_type: 'block', _key: 'b0'},
    )
    // 'block' has no registration outside parent's `of`. callout doesn't
    // declare a positional override for block, so falls back to top-level
    // - which has no 'block' entry. Returns undefined.
    expect(result).toBeUndefined()
  })

  test('7. parent has no `of` match: falls back to top-level', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'image'}],
              },
            ],
          },
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
    )
    const containers = resolveContainersRich(schema, [
      defineContainer({
        type: 'callout',
        childField: 'content',
        render: containerRender,
      }),
    ])
    const richInput = makeRichInput({
      schema,
      containers,
      value: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [{_type: 'image', _key: 'i0', src: 'foo.png'}],
        },
      ],
    })
    const result = resolveContainerByPath(
      richInput,
      [{_key: 'c0'}, 'content', {_key: 'i0'}],
      {_type: 'image', _key: 'i0'},
    )
    // callout's `of` is undefined (no positional overrides registered);
    // fallback to top-level lookup for 'image'. No top-level image
    // registration either, so undefined.
    expect(result).toBeUndefined()
  })

  test('8. nested-only chain: descent threads parent through ancestors', () => {
    const tableSchema = compileSchema(
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
    const tableConfig = resolveNestedContainer(
      tableSchema,
      defineContainer({
        type: 'table',
        childField: 'rows',
        render: containerRender,
        of: [
          defineContainer({
            type: 'row',
            childField: 'cells',
            render: containerRender,
            of: [
              defineContainer({
                type: 'cell',
                childField: 'content',
                render: containerRender,
              }),
            ],
          }),
        ],
      }),
    )
    if (!tableConfig) {
      throw new Error('table failed')
    }
    const containers = new Map([['table', tableConfig]])
    const richInput = makeRichInput({
      schema: tableSchema,
      containers,
      value: [
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              _type: 'row',
              _key: 'r0',
              cells: [{_type: 'cell', _key: 'cell0', content: []}],
            },
          ],
        },
      ],
    })
    const result = resolveContainerByPath(
      richInput,
      [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'cell0'}],
      {_type: 'cell', _key: 'cell0'},
    )
    expect(result !== undefined).toEqual(true)
    if (!result || !('container' in result)) {
      throw new Error('expected cell container')
    }
    expect(result.container.type).toEqual('cell')
    expect(result.field.name).toEqual('content')
  })

  test('9. position-specific descent: same _type in two positions returns position-specific config', () => {
    const dualSchema = compileSchema(
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
    const tableConfig = resolveNestedContainer(
      dualSchema,
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
      dualSchema,
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
      throw new Error('failed')
    }
    const containers = new Map([
      ['table', tableConfig],
      ['diagram', diagramConfig],
    ])
    const richInput = makeRichInput({
      schema: dualSchema,
      containers,
      value: [
        {
          _type: 'table',
          _key: 't0',
          rows: [{_type: 'cell', _key: 'tcell', content: []}],
        },
        {
          _type: 'diagram',
          _key: 'd0',
          shapes: [{_type: 'cell', _key: 'dcell', markers: []}],
        },
      ],
    })
    const tableCell = resolveContainerByPath(
      richInput,
      [{_key: 't0'}, 'rows', {_key: 'tcell'}],
      {_type: 'cell', _key: 'tcell'},
    )
    const diagramCell = resolveContainerByPath(
      richInput,
      [{_key: 'd0'}, 'shapes', {_key: 'dcell'}],
      {_type: 'cell', _key: 'dcell'},
    )
    if (!tableCell || !('container' in tableCell)) {
      throw new Error('table cell')
    }
    if (!diagramCell || !('container' in diagramCell)) {
      throw new Error('diagram cell')
    }
    expect(tableCell.field.name).toEqual('content')
    expect(diagramCell.field.name).toEqual('markers')
  })

  test('10. leaf-ancestor short-circuit: descendants of a leaf-resolved ancestor return undefined', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
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
    const calloutConfig = resolveNestedContainer(
      schema,
      defineContainer({
        type: 'callout',
        childField: 'content',
        render: containerRender,
        of: [defineLeaf({type: 'image', render: leafRender})],
      }),
    )
    if (!calloutConfig) {
      throw new Error('callout failed')
    }
    const containers = new Map([['callout', calloutConfig]])
    const richInput = makeRichInput({
      schema,
      containers,
      value: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'image',
              _key: 'i0',
              caption: [{_type: 'block', _key: 'b0', children: []}],
            },
          ],
        },
      ],
    })
    // Path points to a block inside an image's caption inside the callout.
    // The image is resolved as a leaf in callout's `of`; descent stops
    // returning undefined for descendants.
    const result = resolveContainerByPath(
      richInput,
      [{_key: 'c0'}, 'content', {_key: 'i0'}, 'caption', {_key: 'b0'}],
      {_type: 'block', _key: 'b0'},
    )
    expect(result).toBeUndefined()
  })

  test('11. path-driven top-level fallthrough: no container ancestor returns containers.get(_type)', () => {
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
    const containers = resolveContainersRich(schema, [
      defineContainer({
        type: 'callout',
        childField: 'content',
        render: containerRender,
      }),
    ])
    const richInput = makeRichInput({
      schema,
      containers,
      value: [{_type: 'callout', _key: 'c0', content: []}],
    })
    // Top-level callout has no container ancestor; `descendToParent`
    // returns undefined, then `resolveContainerByPath` falls back to
    // the global `containers.get` entry.
    const result = resolveContainerByPath(richInput, [{_key: 'c0'}], {
      _type: 'callout',
      _key: 'c0',
    })
    expect(result !== undefined).toEqual(true)
    if (!result || !('container' in result)) {
      throw new Error('expected callout')
    }
    expect(result.container.type).toEqual('callout')
  })
})

describe(descendToParent.name, () => {
  test('returns undefined when path has no container ancestor', () => {
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
    const containers = resolveContainers(schema, [
      defineContainer({
        type: 'callout',
        childField: 'content',
        render: containerRender,
      }),
    ])
    const snapshot = makeSnapshot({
      schema,
      containers,
      value: [{_type: 'callout', _key: 'c0', content: []}],
    })
    // Top-level node has no parent.
    expect(descendToParent(snapshot, [{_key: 'c0'}])).toBeUndefined()
  })

  test('returns parent ContainerConfig and parentPath for nested node', () => {
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
    const containers = resolveContainers(schema, [
      defineContainer({
        type: 'callout',
        childField: 'content',
        render: containerRender,
      }),
    ])
    const snapshot = makeSnapshot({
      schema,
      containers,
      value: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
    })
    const descent = descendToParent(snapshot, [
      {_key: 'c0'},
      'content',
      {_key: 'b0'},
    ])
    expect(descent?.parent.type).toEqual('callout')
    expect(descent?.parentPath).toEqual([{_key: 'c0'}])
  })
})
