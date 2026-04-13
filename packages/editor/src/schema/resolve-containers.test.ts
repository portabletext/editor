import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {resolveContainers} from './resolve-containers'

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
      resolveContainers(
        schema,
        new Map([
          [
            'code',
            {
              container: {
                scope: 'code',
                field: 'content',
                render: ({children}) => children,
              },
            },
          ],
        ]),
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

    const render = ({children}: {children: unknown}) => children

    expect(
      resolveContainers(
        schema,
        new Map([
          [
            'table',
            {
              container: {
                scope: 'table',
                field: 'rows',
                render: render as any,
              },
            },
          ],
          [
            'table.row',
            {
              container: {
                scope: 'table.row',
                field: 'cells',
                render: render as any,
              },
            },
          ],
          [
            'table.row.cell',
            {
              container: {
                scope: 'table.row.cell',
                field: 'content',
                render: render as any,
              },
            },
          ],
        ]),
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

    expect(resolveContainers(schema, new Map())).toEqual(new Map())
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

    const render = ({children}: {children: unknown}) => children

    expect(
      resolveContainers(
        schema,
        new Map([
          [
            'code',
            {
              container: {
                scope: 'code',
                field: 'content',
                render: render as any,
              },
            },
          ],
          [
            'callout',
            {
              container: {
                scope: 'callout',
                field: 'content',
                render: render as any,
              },
            },
          ],
        ]),
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

    const render = ({children}: {children: unknown}) => children

    expect(
      resolveContainers(
        schema,
        new Map([
          [
            'block',
            {
              container: {
                scope: 'block',
                field: 'children',
                render: render as any,
              },
            },
          ],
        ]),
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
      ]),
    )
  })

  test('resolves scoped block scope like callout.block', () => {
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

    const render = ({children}: {children: unknown}) => children

    expect(
      resolveContainers(
        schema,
        new Map([
          [
            'callout',
            {
              container: {
                scope: 'callout',
                field: 'content',
                render: render as any,
              },
            },
          ],
          [
            'callout.block',
            {
              container: {
                scope: 'callout.block',
                field: 'children',
                render: render as any,
              },
            },
          ],
        ]),
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

    const render = ({children}: {children: unknown}) => children

    expect(
      resolveContainers(
        schema,
        new Map([
          [
            'block',
            {
              container: {
                scope: 'block',
                field: 'children',
                render: render as any,
              },
            },
          ],
        ]),
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
      resolveContainers(
        schema,
        new Map([
          [
            'figure',
            {
              container: {
                scope: 'figure',
                field: 'caption',
                render: ({children}) => children,
              },
            },
          ],
        ]),
      ),
    ).toEqual(
      new Map([
        ['figure', {name: 'caption', type: 'array', of: [{type: 'block'}]}],
      ]),
    )
  })
})
