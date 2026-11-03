import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {buildBlockIndexMap} from '../../test-utils/build-block-index-map'
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
        arrayField: 'rows',
        render: testRender,
      }),
      defineContainer({
        type: 'row',
        arrayField: 'cells',
        render: testRender,
      }),
      defineContainer({
        type: 'cell',
        arrayField: 'content',
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
      blockIndexMap: buildBlockIndexMap(schema, containers, value),
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
  test('resolves a recursive type declared inline to its declaration two levels deep', () => {
    const schema = compileSchema(recursiveSectionSchemaDefinition())
    const containers = resolveContainers(schema, [
      defineContainer({
        type: 'section',
        arrayField: 'content',
        render: testRender,
      }),
      defineContainer({
        type: 'subsection',
        arrayField: 'content',
        render: testRender,
      }),
    ])
    const value = recursiveSectionValue()
    const context = {
      context: {schema, containers, value},
      blockIndexMap: buildBlockIndexMap(schema, containers, value),
    }

    const subSchema = getPathSubSchema(context, [
      {_key: 's0'},
      'content',
      {_key: 'ss1'},
      'content',
      {_key: 'b1'},
    ])

    expect(subSchema.blockObjects).toEqual([
      {
        name: 'subsection',
        fields: [
          {name: 'title', type: 'string'},
          {
            name: 'content',
            type: 'array',
            of: [
              {
                type: 'block',
                styles: [{value: 'normal', name: 'normal', title: 'Normal'}],
                decorators: [],
                annotations: [],
                lists: [],
                inlineObjects: [],
              },
              {type: 'subsection'},
            ],
          },
        ],
      },
    ])
  })

  test('resolves a recursive type declared inline to its declaration three levels deep', () => {
    const schema = compileSchema(recursiveSectionSchemaDefinition())
    const containers = resolveContainers(schema, [
      defineContainer({
        type: 'section',
        arrayField: 'content',
        render: testRender,
      }),
      defineContainer({
        type: 'subsection',
        arrayField: 'content',
        render: testRender,
      }),
    ])
    const value = recursiveSectionValue()
    const context = {
      context: {schema, containers, value},
      blockIndexMap: buildBlockIndexMap(schema, containers, value),
    }

    const subSchema = getPathSubSchema(context, [
      {_key: 's0'},
      'content',
      {_key: 'ss1'},
      'content',
      {_key: 'ss2'},
      'content',
      {_key: 'b2'},
    ])

    expect(subSchema.blockObjects).toEqual([
      {
        name: 'subsection',
        fields: [
          {name: 'title', type: 'string'},
          {
            name: 'content',
            type: 'array',
            of: [
              {
                type: 'block',
                styles: [{value: 'normal', name: 'normal', title: 'Normal'}],
                decorators: [],
                annotations: [],
                lists: [],
                inlineObjects: [],
              },
              {type: 'subsection'},
            ],
          },
        ],
      },
    ])
  })

  test('resolves a recursive type declared inline inside a nested container two levels deep', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'section'}],
              },
            ],
          },
          ...recursiveSectionSchemaDefinition().blockObjects,
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
        type: 'section',
        arrayField: 'content',
        render: testRender,
      }),
      defineContainer({
        type: 'subsection',
        arrayField: 'content',
        render: testRender,
      }),
    ])
    const value = [
      {_type: 'callout', _key: 'c0', content: recursiveSectionValue()},
    ]
    const context = {
      context: {schema, containers, value},
      blockIndexMap: buildBlockIndexMap(schema, containers, value),
    }

    const subSchema = getPathSubSchema(context, [
      {_key: 'c0'},
      'content',
      {_key: 's0'},
      'content',
      {_key: 'ss1'},
      'content',
      {_key: 'b1'},
    ])

    expect(subSchema.blockObjects).toEqual([
      {
        name: 'subsection',
        fields: [
          {name: 'title', type: 'string'},
          {
            name: 'content',
            type: 'array',
            of: [
              {
                type: 'block',
                styles: [{value: 'normal', name: 'normal', title: 'Normal'}],
                decorators: [],
                annotations: [],
                lists: [],
                inlineObjects: [],
              },
              {type: 'subsection'},
            ],
          },
        ],
      },
    ])
  })

  test('resolves a bare reference to the nearest enclosing declaration of that name', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'section',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [
                  {type: 'block'},
                  {
                    type: 'object',
                    name: 'box',
                    fields: [
                      {name: 'title', type: 'string'},
                      {
                        name: 'content',
                        type: 'array',
                        of: [
                          {type: 'block'},
                          {
                            type: 'object',
                            name: 'panel',
                            fields: [
                              {
                                name: 'content',
                                type: 'array',
                                of: [
                                  {type: 'block'},
                                  {
                                    type: 'object',
                                    name: 'box',
                                    fields: [
                                      {name: 'tone', type: 'string'},
                                      {
                                        name: 'content',
                                        type: 'array',
                                        of: [{type: 'block'}, {type: 'box'}],
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
          },
        ],
      }),
    )
    const containers = resolveContainers(schema, [
      defineContainer({
        type: 'section',
        arrayField: 'content',
        render: testRender,
        of: [
          defineContainer({
            type: 'box',
            arrayField: 'content',
            render: testRender,
            of: [
              defineContainer({
                type: 'panel',
                arrayField: 'content',
                render: testRender,
                of: [
                  defineContainer({
                    type: 'box',
                    arrayField: 'content',
                    render: testRender,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ])
    const value = [
      {
        _type: 'section',
        _key: 's0',
        content: [
          {
            _type: 'box',
            _key: 'x0',
            title: 'foo',
            content: [
              {
                _type: 'panel',
                _key: 'p0',
                content: [
                  {
                    _type: 'box',
                    _key: 'x1',
                    tone: 'bar',
                    content: [{_type: 'block', _key: 'b0', children: []}],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]
    const context = {
      context: {schema, containers, value},
      blockIndexMap: buildBlockIndexMap(schema, containers, value),
    }

    const subSchema = getPathSubSchema(context, [
      {_key: 's0'},
      'content',
      {_key: 'x0'},
      'content',
      {_key: 'p0'},
      'content',
      {_key: 'x1'},
      'content',
      {_key: 'b0'},
    ])

    expect(subSchema.blockObjects).toEqual([
      {
        name: 'box',
        fields: [
          {name: 'tone', type: 'string'},
          {
            name: 'content',
            type: 'array',
            of: [
              {
                type: 'block',
                styles: [{value: 'normal', name: 'normal', title: 'Normal'}],
                decorators: [],
                annotations: [],
                lists: [],
                inlineObjects: [],
              },
              {type: 'box'},
            ],
          },
        ],
      },
    ])
  })
})

function recursiveSectionSchemaDefinition() {
  return defineSchema({
    blockObjects: [
      {
        name: 'section',
        fields: [
          {
            name: 'content',
            type: 'array',
            of: [
              {type: 'block'},
              {
                type: 'object',
                name: 'subsection',
                fields: [
                  {name: 'title', type: 'string'},
                  {
                    name: 'content',
                    type: 'array',
                    of: [{type: 'block'}, {type: 'subsection'}],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  })
}

function recursiveSectionValue() {
  return [
    {
      _type: 'section',
      _key: 's0',
      content: [
        {_type: 'block', _key: 'b0', children: []},
        {
          _type: 'subsection',
          _key: 'ss1',
          title: 'foo',
          content: [
            {_type: 'block', _key: 'b1', children: []},
            {
              _type: 'subsection',
              _key: 'ss2',
              title: 'bar',
              content: [{_type: 'block', _key: 'b2', children: []}],
            },
          ],
        },
      ],
    },
  ]
}
