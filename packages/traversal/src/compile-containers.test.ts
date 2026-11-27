import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test, vi} from 'vitest'
import {
  compileContainers,
  type ContainerDeclaration,
} from './compile-containers'

describe(compileContainers.name, () => {
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
    expect(
      compileContainers(calloutSchema, [
        {
          kind: 'container',
          type: 'callout',
          arrayField: 'content',
        },
      ]),
    ).toEqual(
      new Map([
        [
          'callout',
          {
            kind: 'container',
            type: 'callout',
            field: {
              name: 'content',
              type: 'array',
              of: [
                {
                  type: 'block',
                  annotations: [],
                  decorators: [],
                  inlineObjects: [],
                  lists: [],
                  styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
                },
              ],
            },
          },
        ],
      ]),
    )
  })

  test('drops a text block entry in `of`', () => {
    expect(
      compileContainers(calloutSchema, [
        {
          kind: 'container',
          type: 'callout',
          arrayField: 'content',
          of: [
            {
              kind: 'textBlock',
              type: 'block',
            } as unknown as ContainerDeclaration,
          ],
        },
      ]),
    ).toEqual(
      new Map([
        [
          'callout',
          {
            kind: 'container',
            type: 'callout',
            field: {
              name: 'content',
              type: 'array',
              of: [
                {
                  type: 'block',
                  annotations: [],
                  decorators: [],
                  inlineObjects: [],
                  lists: [],
                  styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
                },
              ],
            },
            of: [],
          },
        ],
      ]),
    )
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
                                of: [
                                  {
                                    type: 'block',
                                    annotations: [],
                                    decorators: [],
                                    inlineObjects: [],
                                    lists: [],
                                    styles: [
                                      {
                                        name: 'normal',
                                        title: 'Normal',
                                        value: 'normal',
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
    expect(
      compileContainers(tableSchema, [
        {
          kind: 'container',
          type: 'table',
          arrayField: 'rows',
          of: [
            {
              kind: 'container',
              type: 'row',
              arrayField: 'cells',
              of: [
                {
                  kind: 'container',
                  type: 'cell',
                  arrayField: 'content',
                },
              ],
            },
          ],
        },
      ]),
    ).toEqual(
      new Map([
        [
          'table',
          {
            kind: 'container',
            type: 'table',
            field: {
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
                                  annotations: [],
                                  decorators: [],
                                  inlineObjects: [],
                                  lists: [],
                                  styles: [
                                    {
                                      name: 'normal',
                                      title: 'Normal',
                                      value: 'normal',
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
            of: [
              {
                kind: 'container',
                type: 'row',
                field: {
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
                              annotations: [],
                              decorators: [],
                              inlineObjects: [],
                              lists: [],
                              styles: [
                                {
                                  name: 'normal',
                                  title: 'Normal',
                                  value: 'normal',
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                of: [
                  {
                    kind: 'container',
                    type: 'cell',
                    field: {
                      name: 'content',
                      type: 'array',
                      of: [
                        {
                          type: 'block',
                          annotations: [],
                          decorators: [],
                          inlineObjects: [],
                          lists: [],
                          styles: [
                            {name: 'normal', title: 'Normal', value: 'normal'},
                          ],
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        ],
      ]),
    )
  })

  test('emits a block-object entry in `of` as a positional block object', () => {
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

    expect(
      compileContainers(schema, [
        {
          kind: 'container',
          type: 'callout',
          arrayField: 'content',
          of: [{kind: 'blockObject', type: 'image'}],
        },
      ]),
    ).toEqual(
      new Map([
        [
          'callout',
          {
            kind: 'container',
            type: 'callout',
            field: {
              name: 'content',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'image',
                  fields: [
                    {
                      name: 'caption',
                      type: 'array',
                      of: [
                        {
                          type: 'block',
                          annotations: [],
                          decorators: [],
                          inlineObjects: [],
                          lists: [],
                          styles: [
                            {name: 'normal', title: 'Normal', value: 'normal'},
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            of: [{kind: 'blockObject', type: 'image'}],
          },
        ],
      ]),
    )
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
      const containers = compileContainers(tableSchema, [
        {
          kind: 'container',
          type: 'table',
          arrayField: 'rows',
          of: [
            {
              kind: 'container',
              type: 'row',
              arrayField: 'cells',
              of: [
                {
                  kind: 'container',
                  type: 'cell',
                  // intentionally wrong field name
                  arrayField: 'contents' as 'content',
                },
              ],
            },
          ],
        },
      ])
      // The nested cell is skipped; table + row remain resolved.
      expect(containers).toEqual(
        new Map([
          [
            'table',
            {
              kind: 'container',
              type: 'table',
              field: {
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
                                    annotations: [],
                                    decorators: [],
                                    inlineObjects: [],
                                    lists: [],
                                    styles: [
                                      {
                                        name: 'normal',
                                        title: 'Normal',
                                        value: 'normal',
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
              of: [
                {
                  kind: 'container',
                  type: 'row',
                  field: {
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
                                annotations: [],
                                decorators: [],
                                inlineObjects: [],
                                lists: [],
                                styles: [
                                  {
                                    name: 'normal',
                                    title: 'Normal',
                                    value: 'normal',
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  of: [],
                },
              ],
            },
          ],
        ]),
      )
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('(nested inside "table" inside "row")'),
      )
    } finally {
      warnSpy.mockRestore()
    }
  })
})

describe('registration warnings', () => {
  const warningSchema = compileSchema(
    defineSchema({
      blockObjects: [
        {
          name: 'table',
          fields: [
            {name: 'rows', type: 'array', of: [{type: 'block'}]},
            {name: 'title', type: 'string'},
            {name: 'tags', type: 'array', of: [{type: 'string'}]},
          ],
        },
      ],
    }),
  )

  test('unknown type names the type, not the field', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const containers = compileContainers(warningSchema, [
        {
          kind: 'container',
          type: 'tabel',
          arrayField: 'rows',
        },
      ])
      expect(containers).toEqual(new Map())
      expect(warnSpy.mock.calls).toEqual([
        [
          'compileContainers: type "tabel" not found in the schema. Declaration skipped.',
        ],
      ])
    } finally {
      warnSpy.mockRestore()
    }
  })

  test('missing field names the field on the (existing) type', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const containers = compileContainers(warningSchema, [
        {
          kind: 'container',
          type: 'table',
          arrayField: 'cols',
        },
      ])
      expect(containers).toEqual(new Map())
      expect(warnSpy.mock.calls).toEqual([
        [
          'compileContainers: field "cols" not found on type "table". Declaration skipped.',
        ],
      ])
    } finally {
      warnSpy.mockRestore()
    }
  })

  test('non-array field is reported as such', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const containers = compileContainers(warningSchema, [
        {
          kind: 'container',
          type: 'table',
          arrayField: 'title',
        },
      ])
      expect(containers).toEqual(new Map())
      expect(warnSpy.mock.calls).toEqual([
        [
          'compileContainers: field "title" on type "table" is not an array. Declaration skipped.',
        ],
      ])
    } finally {
      warnSpy.mockRestore()
    }
  })

  test('primitive-only array warns exactly once', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const containers = compileContainers(warningSchema, [
        {
          kind: 'container',
          type: 'table',
          arrayField: 'tags',
        },
      ])
      expect(containers).toEqual(new Map())
      // Full-calls assertion: pins both the message and that the failure
      // does not double-warn (it used to emit a second, wrong "not
      // found" message).
      expect(warnSpy.mock.calls).toEqual([
        [
          'compileContainers: field "tags" on type "table" contains only primitive types and cannot hold block content. Declaration skipped.',
        ],
      ])
    } finally {
      warnSpy.mockRestore()
    }
  })
})
