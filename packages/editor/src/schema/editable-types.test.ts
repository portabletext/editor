import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {resolveEditableTypes} from './editable-types'

describe(resolveEditableTypes.name, () => {
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
      resolveEditableTypes(
        schema,
        new Map([['code', {renderer: {type: 'code'}}]]),
      ),
    ).toEqual(
      new Map([
        ['code', [{name: 'content', type: 'array', of: [{type: 'codeLine'}]}]],
        ['code.codeLine', []],
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
      resolveEditableTypes(
        schema,
        new Map([['table', {renderer: {type: 'table'}}]]),
      ),
    ).toEqual(
      new Map([
        [
          'table',
          [
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
        ],
        [
          'table.row.cell',
          [{name: 'content', type: 'array', of: [{type: 'block'}]}],
        ],
        [
          'table.row',
          [
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
        ],
      ]),
    )
  })

  test('returns empty Map when no renderers are registered', () => {
    const schema = compileSchema(defineSchema({}))

    expect(resolveEditableTypes(schema, new Map())).toEqual(new Map())
  })

  test('collects multiple array fields on the same type', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'table',
            fields: [
              {name: 'rows', type: 'array', of: [{type: 'row'}]},
              {name: 'alternateRows', type: 'array', of: [{type: 'row'}]},
            ],
          },
        ],
      }),
    )

    expect(
      resolveEditableTypes(
        schema,
        new Map([['table', {renderer: {type: 'table'}}]]),
      ),
    ).toEqual(
      new Map([
        [
          'table',
          [
            {name: 'rows', type: 'array', of: [{type: 'row'}]},
            {name: 'alternateRows', type: 'array', of: [{type: 'row'}]},
          ],
        ],
        ['table.row', []],
      ]),
    )
  })

  test('merges types from multiple renderers', () => {
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
      resolveEditableTypes(
        schema,
        new Map([
          ['code', {renderer: {type: 'code'}}],
          ['callout', {renderer: {type: 'callout'}}],
        ]),
      ),
    ).toEqual(
      new Map([
        ['code', [{name: 'content', type: 'array', of: [{type: 'codeLine'}]}]],
        ['code.codeLine', []],
        ['callout', [{name: 'content', type: 'array', of: [{type: 'block'}]}]],
      ]),
    )
  })
})
