import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import type {EditorSchema} from '../editor/editor-schema'
import type {
  ContainerConfig,
  ContainerDefinition,
} from '../renderers/renderer.types'
import {makeContainerConfig} from './make-container-config'
import type {ChildArrayField, ResolvedContainers} from './resolve-containers'
import {resolveContainers} from './resolve-containers'

const testRender: ContainerDefinition['render'] = ({children}) => children

function makeConfigs(
  schema: EditorSchema,
  containers: Array<ContainerDefinition>,
): Map<string, ContainerConfig> {
  const map = new Map<string, ContainerConfig>()
  for (const container of containers) {
    map.set(container.scope, makeContainerConfig(schema, container))
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

/**
 * What `{type: 'block'}` compiles to when the root schema has no decorators,
 * annotations, lists or inline objects declared. Compile resolves inheritance
 * and fills in the defaults (the auto-prepended `normal` style and empty
 * arrays for everything else).
 */
const resolvedEmptyBlock = {
  type: 'block',
  styles: [{name: 'normal', value: 'normal', title: 'Normal'}],
  decorators: [],
  annotations: [],
  lists: [],
  inlineObjects: [],
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
            {
              scope: '$..code',
              field: 'content',
              render: ({children}) => children,
            },
          ]),
        ),
      ),
    ).toEqual(
      new Map([
        ['code', {name: 'content', type: 'array', of: [{type: 'codeLine'}]}],
      ]),
    )
  })

  test('resolves a deeply nested container', () => {
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
    expect(
      fields(
        resolveContainers(
          schema,
          makeConfigs(schema, [
            {scope: '$..table', field: 'rows', render: testRender},
            {scope: '$..table.row', field: 'cells', render: testRender},
            {
              scope: '$..table.row.cell',
              field: 'content',
              render: testRender,
            },
          ]),
        ),
      ),
    ).toEqual(
      new Map([
        [
          'table',
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
                            of: [resolvedEmptyBlock],
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
        [
          'table.row',
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
                    of: [resolvedEmptyBlock],
                  },
                ],
              },
            ],
          },
        ],
        [
          'table.row.cell',
          {name: 'content', type: 'array', of: [resolvedEmptyBlock]},
        ],
      ]),
    )
  })

  test('returns empty Map when no containers are registered', () => {
    const schema = compileSchema(defineSchema({}))

    expect(fields(resolveContainers(schema, new Map()))).toEqual(new Map())
  })

  test('merges types from multiple container configs', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'code',
            fields: [
              {name: 'content', type: 'array', of: [{type: 'codeLine'}]},
            ],
          },
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
    )
    expect(
      fields(
        resolveContainers(
          schema,
          makeConfigs(schema, [
            {scope: '$..code', field: 'content', render: testRender},
            {scope: '$..callout', field: 'content', render: testRender},
          ]),
        ),
      ),
    ).toEqual(
      new Map([
        ['code', {name: 'content', type: 'array', of: [{type: 'codeLine'}]}],
        ['callout', {name: 'content', type: 'array', of: [resolvedEmptyBlock]}],
      ]),
    )
  })

  test('resolves bare block scope to synthesized children field', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
        inlineObjects: [{name: 'stock-ticker'}],
      }),
    )
    expect(
      fields(
        resolveContainers(
          schema,
          makeConfigs(schema, [
            {scope: '$..block', field: 'children', render: testRender},
          ]),
        ),
      ),
    ).toEqual(
      new Map([
        [
          'block',
          {
            name: 'children',
            type: 'array',
            of: [{type: 'span'}, {type: 'stock-ticker'}],
          },
        ],
        [
          'callout.block',
          {
            name: 'children',
            type: 'array',
            of: [{type: 'span'}, {type: 'stock-ticker'}],
          },
        ],
      ]),
    )
  })

  test('root-anchored block scope only resolves root blocks', () => {
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
    expect(
      fields(
        resolveContainers(
          schema,
          makeConfigs(schema, [
            {scope: '$.block', field: 'children', render: testRender},
          ]),
        ),
      ),
    ).toEqual(
      new Map([
        ['block', {name: 'children', type: 'array', of: [{type: 'span'}]}],
      ]),
    )
  })

  test('resolves scoped block scope like $..callout.block', () => {
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
    expect(
      fields(
        resolveContainers(
          schema,
          makeConfigs(schema, [
            {scope: '$..callout', field: 'content', render: testRender},
            {
              scope: '$..callout.block',
              field: 'children',
              render: testRender,
            },
          ]),
        ),
      ),
    ).toEqual(
      new Map([
        ['callout', {name: 'content', type: 'array', of: [resolvedEmptyBlock]}],
        [
          'callout.block',
          {name: 'children', type: 'array', of: [{type: 'span'}]},
        ],
      ]),
    )
  })

  test('resolves block scope without inline objects', () => {
    const schema = compileSchema(defineSchema({}))
    expect(
      fields(
        resolveContainers(
          schema,
          makeConfigs(schema, [
            {scope: '$..block', field: 'children', render: testRender},
          ]),
        ),
      ),
    ).toEqual(
      new Map([
        ['block', {name: 'children', type: 'array', of: [{type: 'span'}]}],
      ]),
    )
  })

  test('ignores fields not matching the declared name', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'figure',
            fields: [
              {name: 'caption', type: 'array', of: [{type: 'block'}]},
              {name: 'tags', type: 'array', of: [{type: 'string'}]},
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
            {
              scope: '$..figure',
              field: 'caption',
              render: ({children}) => children,
            },
          ]),
        ),
      ),
    ).toEqual(
      new Map([
        ['figure', {name: 'caption', type: 'array', of: [resolvedEmptyBlock]}],
      ]),
    )
  })

  test('resolves a bare type reference inside a container', () => {
    // Schema: callout's content holds blocks AND a bare reference to a
    // top-level `image` block-object. The resolver should follow the
    // reference and emit a candidate at `callout.image`.
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
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
        ],
      }),
    )

    expect(
      fields(
        resolveContainers(
          schema,
          makeConfigs(schema, [
            {
              scope: '$..callout',
              field: 'content',
              render: ({children}) => children,
            },
          ]),
        ),
      ),
    ).toEqual(
      new Map([
        [
          'callout',
          {
            name: 'content',
            type: 'array',
            of: [resolvedEmptyBlock, {type: 'image'}],
          },
        ],
      ]),
    )
  })

  test('resolves a self-referential schema with cycle detection', () => {
    // A `list` whose `list-item.content.of` references `list` again.
    // The resolver should walk one level, hit the cycle, and emit
    // candidates at `list`, `list.list-item`, `list.list-item.list`.
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'list',
            fields: [
              {name: 'kind', type: 'string'},
              {
                name: 'items',
                type: 'array',
                of: [
                  {
                    type: 'object',
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
              },
            ],
          },
        ],
      }),
    )

    const resolved = resolveContainers(
      schema,
      makeConfigs(schema, [
        {
          scope: '$..list',
          field: 'items',
          render: ({children}) => children,
        },
        {
          scope: '$..list.list-item',
          field: 'content',
          render: ({children}) => children,
        },
      ]),
    )

    // The walk reaches `list` (top), `list.list-item` (inline), and emits
    // a cycle candidate at `list.list-item.list` (where
    // `list-item.content` references `list` again). The walk terminates -
    // no infinite candidates - and `$..list` matches both the root list
    // and the cycle position via terminal-anchored matching.
    expect(Array.from(resolved.keys()).sort()).toEqual([
      'list',
      'list.list-item',
      'list.list-item.list',
    ])
  })

  test('skips bare references whose target is undeclared', () => {
    // `{type: 'list'}` referenced inside a container but no `list` declared
    // anywhere. The resolver should silently skip - no candidate emitted.
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
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

    const resolved = resolveContainers(
      schema,
      makeConfigs(schema, [
        {
          scope: '$..callout',
          field: 'content',
          render: ({children}) => children,
        },
      ]),
    )

    expect(Array.from(resolved.keys()).sort()).toEqual(['callout'])
  })

  test('resolves a reference to an inline-declared type from its descendant', () => {
    // `list` is declared inline inside callout's content. `list-item.content.of`
    // references `list` again. Even though `list` is NOT at the schema root,
    // the resolver should follow the reference because `list` is in the
    // ancestor chain when we encounter the bare reference.
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
                  {type: 'block'},
                  {
                    type: 'object',
                    name: 'list',
                    fields: [
                      {
                        name: 'items',
                        type: 'array',
                        of: [
                          {
                            type: 'object',
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

    const resolved = resolveContainers(
      schema,
      makeConfigs(schema, [
        {
          scope: '$..callout',
          field: 'content',
          render: ({children}) => children,
        },
        {
          scope: '$..list',
          field: 'items',
          render: ({children}) => children,
        },
        {
          scope: '$..list.list-item',
          field: 'content',
          render: ({children}) => children,
        },
        {
          // This is the new case - registering the cycle candidate.
          // Previously, the resolver couldn't emit this candidate
          // because `list` isn't at the schema root.
          scope: '$..list.list-item.list',
          field: 'items',
          render: ({children}) => children,
        },
      ]),
    )

    // `callout`, `callout.list`, `callout.list.list-item`, and the cycle
    // candidate `callout.list.list-item.list` all resolve. Without
    // ancestor-aware reference resolution, the cycle candidate would be
    // dropped because `list` isn't in `schema.blockObjects`.
    expect(Array.from(resolved.keys()).sort()).toEqual([
      'callout',
      'callout.list',
      'callout.list.list-item',
      'callout.list.list-item.list',
    ])
  })

  test('reference to inline-declared type only visible to descendants of the declaration', () => {
    // `list` is inline-declared inside callout.content. A SIBLING entry in
    // callout.content also has `{type: 'list'}` - but that sibling is NOT a
    // descendant of the list declaration, so the ancestor chain at that
    // walk position contains only `callout`, not `list`. The reference
    // should NOT resolve (no root `list` either).
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
                  {type: 'block'},
                  {
                    type: 'object',
                    name: 'list',
                    fields: [
                      {name: 'kind', type: 'string'},
                      {
                        name: 'items',
                        type: 'array',
                        of: [{type: 'block'}],
                      },
                    ],
                  },
                  // Sibling reference to `list` - outside `list`'s descendant
                  // scope. With path-scoped resolution (not hoisting), this
                  // should NOT resolve.
                  {type: 'list'},
                ],
              },
            ],
          },
        ],
      }),
    )

    const resolved = resolveContainers(
      schema,
      makeConfigs(schema, [
        {
          scope: '$..callout',
          field: 'content',
          render: ({children}) => children,
        },
        {
          scope: '$..list',
          field: 'items',
          render: ({children}) => children,
        },
      ]),
    )

    // `callout` and `callout.list` resolve. The sibling reference is silently
    // dropped because `list` isn't in the ancestor chain at THAT walk
    // position and isn't at root either.
    expect(Array.from(resolved.keys()).sort()).toEqual([
      'callout',
      'callout.list',
    ])
  })

  test('inline ancestor shadows root declaration of the same name', () => {
    // `list` is declared at root with one shape (items: [block]) AND
    // inline-declared inside callout with a different shape
    // (items: [block, list]). Inside the inline declaration's descendants,
    // `{type: 'list'}` should resolve to the INLINE shape (closer ancestor
    // wins), not the root one.
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'list',
            fields: [{name: 'items', type: 'array', of: [{type: 'block'}]}],
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
                    name: 'list',
                    fields: [
                      {
                        name: 'items',
                        type: 'array',
                        of: [
                          {
                            type: 'object',
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

    const resolved = resolveContainers(
      schema,
      makeConfigs(schema, [
        {scope: '$.list', field: 'items', render: ({children}) => children},
        {
          scope: '$..callout',
          field: 'content',
          render: ({children}) => children,
        },
        {
          scope: '$..callout.list',
          field: 'items',
          render: ({children}) => children,
        },
        {
          scope: '$..callout.list.list-item',
          field: 'content',
          render: ({children}) => children,
        },
        {
          scope: '$..callout.list.list-item.list',
          field: 'items',
          render: ({children}) => children,
        },
      ]),
    )

    // The root `list` resolves on its own. Inside callout, the inline
    // declaration shadows root, and the cycle reference resolves to the
    // INLINE shape - so the cycle candidate at `callout.list.list-item.list`
    // is emitted.
    expect(Array.from(resolved.keys()).sort()).toEqual([
      'callout',
      'callout.list',
      'callout.list.list-item',
      'callout.list.list-item.list',
      'list',
    ])

    // The cycle candidate's field MUST be the INLINE shape, not the root
    // shape. The inline `list` accepts list-items inside its `items` field;
    // the root `list` accepts plain blocks.
    const cycleField = resolved.get('callout.list.list-item.list')?.field
    expect(cycleField?.of[0]).toEqual(
      expect.objectContaining({
        type: 'object',
        name: 'list-item',
      }),
    )
  })

  test('reference falls back to root when not in ancestor chain', () => {
    // Plain root-only reference (the case PR #2630 already supports).
    // Kept as a regression test alongside the new ancestor-aware paths.
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
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
        ],
      }),
    )

    const resolved = resolveContainers(
      schema,
      makeConfigs(schema, [
        {
          scope: '$..callout',
          field: 'content',
          render: ({children}) => children,
        },
      ]),
    )

    expect(Array.from(resolved.keys()).sort()).toEqual(['callout'])
  })

  test('mutually-recursive root types: cycle stub resolves against root', () => {
    // Mirror the bridge's cross-root-reference output. `a` and `b` are both
    // at the root. `a.content` inlines `b` one level; that inlined `b`
    // contains a cycle stub `{type: 'a'}`. The resolver should follow the
    // stub via root lookup and emit a candidate at the cycle position.
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'a',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [
                  {type: 'block'},
                  {
                    type: 'object',
                    name: 'b',
                    fields: [
                      {
                        name: 'content',
                        type: 'array',
                        of: [{type: 'block'}, {type: 'a'}],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            name: 'b',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [
                  {type: 'block'},
                  {
                    type: 'object',
                    name: 'a',
                    fields: [
                      {
                        name: 'content',
                        type: 'array',
                        of: [{type: 'block'}, {type: 'b'}],
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

    const resolved = resolveContainers(
      schema,
      makeConfigs(schema, [
        {scope: '$..a', field: 'content', render: testRender},
        {scope: '$..b', field: 'content', render: testRender},
        {scope: '$..a.b', field: 'content', render: testRender},
        {scope: '$..b.a', field: 'content', render: testRender},
        {scope: '$..a.b.a', field: 'content', render: testRender},
        {scope: '$..b.a.b', field: 'content', render: testRender},
      ]),
    )

    // Each root + the inlined level + the cycle reference all resolve.
    expect(Array.from(resolved.keys()).sort()).toEqual([
      'a',
      'a.b',
      'a.b.a',
      'b',
      'b.a',
      'b.a.b',
    ])
  })

  test('callout references a root-declared recursive list', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'list'}],
              },
            ],
          },
          {
            name: 'list',
            fields: [
              {
                name: 'items',
                type: 'array',
                of: [
                  {
                    type: 'object',
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
              },
            ],
          },
        ],
      }),
    )

    const resolved = resolveContainers(
      schema,
      makeConfigs(schema, [
        {scope: '$..callout', field: 'content', render: testRender},
        {scope: '$..list', field: 'items', render: testRender},
        {scope: '$..list-item', field: 'content', render: testRender},
        {scope: '$..callout.list', field: 'items', render: testRender},
        {
          scope: '$..callout.list.list-item',
          field: 'content',
          render: testRender,
        },
        {
          scope: '$..callout.list.list-item.list',
          field: 'items',
          render: testRender,
        },
      ]),
    )

    expect(Array.from(resolved.keys()).sort()).toEqual([
      'callout',
      'callout.list',
      'callout.list.list-item',
      'callout.list.list-item.list',
      'list',
      'list.list-item',
      'list.list-item.list',
    ])
  })
})
