import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {defineContainer, type Container} from '../renderers/renderer.types'
import {resolveContainers} from '../schema/resolve-containers'
import {getUnwrapTarget} from './get-unwrap-target'

const testRender: Container['render'] = ({children}) => children

describe(getUnwrapTarget.name, () => {
  test('stops at the origin when its parent accepts the payload', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'cell',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [
                  {type: 'block'},
                  {
                    type: 'object',
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
              },
            ],
          },
        ],
      }),
    )
    const configs = [
      defineContainer({
        type: 'cell',
        childField: 'content',
        render: testRender,
      }),
      defineContainer({
        type: 'callout',
        childField: 'content',
        render: testRender,
      }),
    ]
    const containers = resolveContainers(schema, configs)

    expect(
      getUnwrapTarget(
        {
          context: {
            schema,
            containers,
            value: [
              {
                _type: 'cell',
                _key: 'c0',
                content: [
                  {
                    _type: 'callout',
                    _key: 'co0',
                    content: [
                      {
                        _type: 'block',
                        _key: 'cb0',
                        children: [
                          {_type: 'span', _key: 'cs0', text: '', marks: []},
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          blockIndexMap: new Map(),
        },
        [{_key: 'c0'}, 'content', {_key: 'co0'}],
        new Set(['block']),
      ),
    ).toEqual([{_key: 'c0'}, 'content', {_key: 'co0'}])
  })

  test('walks up through structural ancestors until root accepts the payload', () => {
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
                                    type: 'object',
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
    const configs = [
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
      defineContainer({
        type: 'callout',
        childField: 'content',
        render: testRender,
      }),
    ]
    const containers = resolveContainers(schema, configs)

    expect(
      getUnwrapTarget(
        {
          context: {
            schema,
            containers,
            value: [
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
                        content: [
                          {
                            _type: 'callout',
                            _key: 'co0',
                            content: [
                              {
                                _type: 'block',
                                _key: 'cb0',
                                children: [
                                  {
                                    _type: 'span',
                                    _key: 'cs0',
                                    text: '',
                                    marks: [],
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
          blockIndexMap: new Map(),
        },
        [
          {_key: 't0'},
          'rows',
          {_key: 'r0'},
          'cells',
          {_key: 'c0'},
          'content',
          {_key: 'co0'},
        ],
        new Set(['block']),
      ),
    ).toEqual([{_key: 't0'}])
  })

  test('no-ops when a non-lonely ancestor blocks the cascade', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
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
                            type: 'object',
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
    const configs = [
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
      defineContainer({
        type: 'callout',
        childField: 'content',
        render: testRender,
      }),
    ]
    const containers = resolveContainers(schema, configs)

    expect(
      getUnwrapTarget(
        {
          context: {
            schema,
            containers,
            value: [
              {
                _type: 'row',
                _key: 'r0',
                cells: [
                  {
                    _type: 'cell',
                    _key: 'c0',
                    content: [
                      {
                        _type: 'callout',
                        _key: 'co0',
                        content: [
                          {
                            _type: 'block',
                            _key: 'cb0',
                            children: [
                              {_type: 'span', _key: 'cs0', text: '', marks: []},
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    _type: 'cell',
                    _key: 'c1',
                    content: [
                      {
                        _type: 'callout',
                        _key: 'co1',
                        content: [
                          {
                            _type: 'block',
                            _key: 'cb1',
                            children: [
                              {
                                _type: 'span',
                                _key: 'cs1',
                                text: 'bar',
                                marks: [],
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
          blockIndexMap: new Map(),
        },
        [{_key: 'r0'}, 'cells', {_key: 'c0'}, 'content', {_key: 'co0'}],
        new Set(['block']),
      ),
    ).toBeUndefined()
  })

  test('returns origin when it sits at the root', () => {
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
    const configs = [
      defineContainer({
        type: 'callout',
        childField: 'content',
        render: testRender,
      }),
    ]
    const containers = resolveContainers(schema, configs)

    expect(
      getUnwrapTarget(
        {
          context: {
            schema,
            containers,
            value: [
              {
                _type: 'callout',
                _key: 'co0',
                content: [
                  {
                    _type: 'block',
                    _key: 'cb0',
                    children: [
                      {_type: 'span', _key: 'cs0', text: '', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
          blockIndexMap: new Map(),
        },
        [{_key: 'co0'}],
        new Set(['block']),
      ),
    ).toEqual([{_key: 'co0'}])
  })

  test('returns origin when its parent accepts a mixed payload directly', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {name: 'image'},
          {
            name: 'cell',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [
                  {type: 'block'},
                  {type: 'image'},
                  {
                    type: 'object',
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
              },
            ],
          },
        ],
      }),
    )
    const configs = [
      defineContainer({
        type: 'cell',
        childField: 'content',
        render: testRender,
      }),
      defineContainer({
        type: 'callout',
        childField: 'content',
        render: testRender,
      }),
    ]
    const containers = resolveContainers(schema, configs)

    expect(
      getUnwrapTarget(
        {
          context: {
            schema,
            containers,
            value: [
              {
                _type: 'cell',
                _key: 'c0',
                content: [
                  {
                    _type: 'callout',
                    _key: 'co0',
                    content: [
                      {
                        _type: 'block',
                        _key: 'cb0',
                        children: [
                          {_type: 'span', _key: 'cs0', text: '', marks: []},
                        ],
                      },
                      {_type: 'image', _key: 'im0'},
                    ],
                  },
                ],
              },
            ],
          },
          blockIndexMap: new Map(),
        },
        [{_key: 'c0'}, 'content', {_key: 'co0'}],
        new Set(['block', 'image']),
      ),
    ).toEqual([{_key: 'c0'}, 'content', {_key: 'co0'}])
  })

  test('walks up to root when a mixed payload needs to escape a rejecting parent', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {name: 'image'},
          {
            name: 'cell',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [
                  {
                    type: 'object',
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
              },
            ],
          },
        ],
      }),
    )
    const configs = [
      defineContainer({
        type: 'cell',
        childField: 'content',
        render: testRender,
      }),
      defineContainer({
        type: 'callout',
        childField: 'content',
        render: testRender,
      }),
    ]
    const containers = resolveContainers(schema, configs)

    expect(
      getUnwrapTarget(
        {
          context: {
            schema,
            containers,
            value: [
              {
                _type: 'cell',
                _key: 'c0',
                content: [
                  {
                    _type: 'callout',
                    _key: 'co0',
                    content: [
                      {
                        _type: 'block',
                        _key: 'cb0',
                        children: [
                          {_type: 'span', _key: 'cs0', text: '', marks: []},
                        ],
                      },
                      {_type: 'image', _key: 'im0'},
                    ],
                  },
                ],
              },
            ],
          },
          blockIndexMap: new Map(),
        },
        [{_key: 'c0'}, 'content', {_key: 'co0'}],
        new Set(['block', 'image']),
      ),
    ).toEqual([{_key: 'c0'}])
  })

  test('no-ops when root does not accept every payload type', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'cell',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [
                  {
                    type: 'object',
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
              },
            ],
          },
        ],
      }),
    )
    const configs = [
      defineContainer({
        type: 'cell',
        childField: 'content',
        render: testRender,
      }),
      defineContainer({
        type: 'callout',
        childField: 'content',
        render: testRender,
      }),
    ]
    const containers = resolveContainers(schema, configs)

    expect(
      getUnwrapTarget(
        {
          context: {
            schema,
            containers,
            value: [
              {
                _type: 'cell',
                _key: 'c0',
                content: [
                  {
                    _type: 'callout',
                    _key: 'co0',
                    content: [
                      {
                        _type: 'block',
                        _key: 'cb0',
                        children: [
                          {_type: 'span', _key: 'cs0', text: '', marks: []},
                        ],
                      },
                      {_type: 'image', _key: 'im0'},
                    ],
                  },
                ],
              },
            ],
          },
          blockIndexMap: new Map(),
        },
        [{_key: 'c0'}, 'content', {_key: 'co0'}],
        new Set(['block', 'image']),
      ),
    ).toBeUndefined()
  })

  test('no-ops when the origin has a sibling at the same level', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
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
      }),
    )
    const configs = [
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
    ]
    const containers = resolveContainers(schema, configs)

    expect(
      getUnwrapTarget(
        {
          context: {
            schema,
            containers,
            value: [
              {
                _type: 'row',
                _key: 'r0',
                cells: [
                  {
                    _type: 'cell',
                    _key: 'c0',
                    content: [
                      {
                        _type: 'block',
                        _key: 'b0',
                        children: [
                          {_type: 'span', _key: 's0', text: '', marks: []},
                        ],
                      },
                    ],
                  },
                  {
                    _type: 'cell',
                    _key: 'c1',
                    content: [
                      {
                        _type: 'block',
                        _key: 'b1',
                        children: [
                          {_type: 'span', _key: 's1', text: 'bar', marks: []},
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          blockIndexMap: new Map(),
        },
        [{_key: 'r0'}, 'cells', {_key: 'c0'}],
        new Set(['block']),
      ),
    ).toBeUndefined()
  })

  test('stops at an intermediate ancestor when its parent accepts the payload', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {name: 'image'},
          {
            name: 'cell',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [
                  {type: 'block'},
                  {type: 'image'},
                  {
                    type: 'object',
                    name: 'section',
                    fields: [
                      {
                        name: 'content',
                        type: 'array',
                        of: [
                          {
                            type: 'object',
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
    const configs = [
      defineContainer({
        type: 'cell',
        childField: 'content',
        render: testRender,
      }),
      defineContainer({
        type: 'section',
        childField: 'content',
        render: testRender,
      }),
      defineContainer({
        type: 'callout',
        childField: 'content',
        render: testRender,
      }),
    ]
    const containers = resolveContainers(schema, configs)

    expect(
      getUnwrapTarget(
        {
          context: {
            schema,
            containers,
            value: [
              {
                _type: 'cell',
                _key: 'c0',
                content: [
                  {
                    _type: 'section',
                    _key: 'se0',
                    content: [
                      {
                        _type: 'callout',
                        _key: 'co0',
                        content: [
                          {
                            _type: 'block',
                            _key: 'cb0',
                            children: [
                              {_type: 'span', _key: 'cs0', text: '', marks: []},
                            ],
                          },
                          {_type: 'image', _key: 'im0'},
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          blockIndexMap: new Map(),
        },
        [{_key: 'c0'}, 'content', {_key: 'se0'}, 'content', {_key: 'co0'}],
        new Set(['block', 'image']),
      ),
    ).toEqual([{_key: 'c0'}, 'content', {_key: 'se0'}])
  })

  test('no-ops when origin sits at the root and root rejects part of the payload', () => {
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
        ],
      }),
    )
    const configs = [
      defineContainer({
        type: 'callout',
        childField: 'content',
        render: testRender,
      }),
    ]
    const containers = resolveContainers(schema, configs)

    expect(
      getUnwrapTarget(
        {
          context: {
            schema,
            containers,
            value: [
              {
                _type: 'callout',
                _key: 'co0',
                content: [
                  {
                    _type: 'block',
                    _key: 'cb0',
                    children: [
                      {_type: 'span', _key: 'cs0', text: '', marks: []},
                    ],
                  },
                  {_type: 'image', _key: 'im0'},
                ],
              },
            ],
          },
          blockIndexMap: new Map(),
        },
        [{_key: 'co0'}],
        new Set(['block', 'image']),
      ),
    ).toBeUndefined()
  })
})
