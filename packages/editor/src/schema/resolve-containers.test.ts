import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import type {EditorSchema} from '../editor/editor-schema'
import type {Container, ContainerConfig} from '../renderers/renderer.types'
import {makeContainerConfig} from './make-container-config'
import type {ChildArrayField, Containers} from './resolve-containers'
import {resolveContainers} from './resolve-containers'

const testRender: Container['render'] = ({children}) => children

function makeConfigs(
  schema: EditorSchema,
  containers: Array<Container>,
): Map<string, ContainerConfig> {
  const map = new Map<string, ContainerConfig>()
  for (const container of containers) {
    map.set(container.scope, makeContainerConfig(schema, container))
  }
  return map
}

/** Extract the `field` shape from a resolved containers map for easier testing. */
function fields(containers: Containers): Map<string, ChildArrayField> {
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
        [
          'table.row',
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
        [
          'table.row.cell',
          {name: 'content', type: 'array', of: [{type: 'block'}]},
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
        ['callout', {name: 'content', type: 'array', of: [{type: 'block'}]}],
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
        ['callout', {name: 'content', type: 'array', of: [{type: 'block'}]}],
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
        ['figure', {name: 'caption', type: 'array', of: [{type: 'block'}]}],
      ]),
    )
  })
})
