import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {defineContainer, type Container} from '../renderers/renderer.types'
import {resolveContainers} from '../schema/resolve-containers'
import {getUnionSchema} from './get-union-schema'

const testRender: Container['render'] = ({children}) => children

describe(getUnionSchema.name, () => {
  test('returns the root schema when no containers are registered', () => {
    const schema = compileSchema(
      defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'h1'}],
      }),
    )

    const union = getUnionSchema(schema, new Map())

    expect(union).toEqual(schema)
  })

  test('merges container sub-schema members with root, deduped by name', () => {
    const schema = compileSchema(
      defineSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'h1'}],
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [
                  {
                    type: 'block',
                    decorators: [{name: 'em'}, {name: 'strong'}],
                    styles: [{name: 'callout-body'}],
                  },
                ],
              },
            ],
          },
          {
            name: 'code-block',
            fields: [
              {
                name: 'lines',
                type: 'array',
                of: [
                  {
                    type: 'block',
                    decorators: [{name: 'code'}],
                    styles: [{name: 'monospace'}],
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
        type: 'callout',
        arrayField: 'content',
        render: testRender,
      }),
      defineContainer({
        type: 'code-block',
        arrayField: 'lines',
        render: testRender,
      }),
    ])

    const union = getUnionSchema(schema, containers)

    expect(union).toEqual({
      ...schema,
      decorators: [
        {name: 'strong', value: 'strong'},
        {name: 'em', value: 'em'},
        {name: 'code', value: 'code'},
      ],
      styles: [
        {name: 'normal', value: 'normal', title: 'Normal'},
        {name: 'h1', value: 'h1'},
        {name: 'callout-body', value: 'callout-body'},
        {name: 'monospace', value: 'monospace'},
      ],
    })
  })

  test('does not include sub-schema for unregistered containers', () => {
    const schema = compileSchema(
      defineSchema({
        decorators: [{name: 'strong'}],
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [
                  {
                    type: 'block',
                    decorators: [{name: 'em'}],
                  },
                ],
              },
            ],
          },
        ],
      }),
    )

    const union = getUnionSchema(schema, new Map())

    expect(union).toEqual(schema)
  })

  test('excludes structural containers whose field does not accept text blocks', () => {
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
                                of: [
                                  {
                                    type: 'block',
                                    decorators: [{name: 'code'}],
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
        arrayField: 'rows',
        render: testRender,
        of: [
          defineContainer({
            type: 'row',
            arrayField: 'cells',
            render: testRender,
            of: [
              defineContainer({
                type: 'cell',
                arrayField: 'content',
                render: testRender,
              }),
            ],
          }),
        ],
      }),
    ])

    const union = getUnionSchema(schema, containers)

    expect(union).toEqual({
      ...schema,
      decorators: [{name: 'code', value: 'code'}],
    })
  })

  test('merges members declared by containers nested in another container', () => {
    const schema = compileSchema(
      defineSchema({
        decorators: [{name: 'strong'}],
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
                                    decorators: [
                                      {name: 'strong'},
                                      {name: 'code'},
                                    ],
                                    annotations: [{name: 'link'}],
                                    lists: [{name: 'bullet'}],
                                    styles: [{name: 'h1'}],
                                    inlineObjects: [{name: 'mention'}],
                                  },
                                  {type: 'object', name: 'image', fields: []},
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
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block', decorators: [{name: 'em'}]}],
              },
            ],
          },
        ],
      }),
    )
    const containers = resolveContainers(schema, [
      defineContainer({
        type: 'table',
        arrayField: 'rows',
        render: testRender,
        of: [
          defineContainer({
            type: 'row',
            arrayField: 'cells',
            render: testRender,
            of: [
              defineContainer({
                type: 'cell',
                arrayField: 'content',
                render: testRender,
              }),
            ],
          }),
        ],
      }),
      defineContainer({
        type: 'callout',
        arrayField: 'content',
        render: testRender,
      }),
    ])

    const union = getUnionSchema(schema, containers)

    expect(union).toEqual({
      ...schema,
      decorators: [
        {name: 'strong', value: 'strong'},
        {name: 'em', value: 'em'},
        {name: 'code', value: 'code'},
      ],
      annotations: [{name: 'link', fields: []}],
      lists: [{name: 'bullet', value: 'bullet'}],
      styles: [
        {name: 'normal', value: 'normal', title: 'Normal'},
        {name: 'h1', value: 'h1'},
      ],
      inlineObjects: [{name: 'mention', fields: []}],
      blockObjects: [...schema.blockObjects, {name: 'image', fields: []}],
    })
  })

  test('keeps a later top-level container definition over a nested container definition of the same name', () => {
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
                                of: [
                                  {
                                    type: 'block',
                                    decorators: [
                                      {name: 'code', title: 'Cell code'},
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
          },
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [
                  {
                    type: 'block',
                    decorators: [{name: 'code', title: 'Callout code'}],
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
        arrayField: 'rows',
        render: testRender,
        of: [
          defineContainer({
            type: 'row',
            arrayField: 'cells',
            render: testRender,
            of: [
              defineContainer({
                type: 'cell',
                arrayField: 'content',
                render: testRender,
              }),
            ],
          }),
        ],
      }),
      defineContainer({
        type: 'callout',
        arrayField: 'content',
        render: testRender,
      }),
    ])

    const union = getUnionSchema(schema, containers)

    expect(union).toEqual({
      ...schema,
      decorators: [{name: 'code', value: 'code', title: 'Callout code'}],
    })
  })

  test('keeps the root definition over a nested container definition of the same name', () => {
    const schema = compileSchema(
      defineSchema({
        decorators: [{name: 'strong', title: 'Root strong'}],
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
                                    decorators: [
                                      {name: 'strong', title: 'Cell strong'},
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
          },
        ],
      }),
    )
    const containers = resolveContainers(schema, [
      defineContainer({
        type: 'table',
        arrayField: 'rows',
        render: testRender,
        of: [
          defineContainer({
            type: 'row',
            arrayField: 'cells',
            render: testRender,
            of: [
              defineContainer({
                type: 'cell',
                arrayField: 'content',
                render: testRender,
              }),
            ],
          }),
        ],
      }),
    ])

    const union = getUnionSchema(schema, containers)

    expect(union).toEqual({
      ...schema,
      decorators: [{name: 'strong', value: 'strong', title: 'Root strong'}],
    })
  })
})
