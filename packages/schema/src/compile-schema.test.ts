import {describe, expect, test, vi} from 'vitest'
import {compileSchema} from './compile-schema'
import type {SchemaDefinition} from './define-schema'
import type {
  BlockOfDefinition,
  FieldDefinition,
  InlineObjectOfDefinition,
  OfDefinition,
} from './schema'

describe(compileSchema.name, () => {
  describe('block fields', () => {
    test('reserved fields are ignored and warned about', () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      expect(
        compileSchema({block: {fields: [{name: '_type', type: 'string'}]}}),
      ).toEqual({
        block: {name: 'block'},
        span: {name: 'span'},
        styles: [{value: 'normal', name: 'normal', title: 'Normal'}],
        lists: [],
        decorators: [],
        annotations: [],
        blockObjects: [],
        inlineObjects: [],
      })

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '"_type" is a reserved field name on Portable Text blocks',
      )

      consoleWarnSpy.mockRestore()
    })

    test('custom fields are included', () => {
      expect(
        compileSchema({block: {fields: [{name: 'foo', type: 'string'}]}}),
      ).toEqual({
        block: {name: 'block', fields: [{name: 'foo', type: 'string'}]},
        span: {name: 'span'},
        styles: [{value: 'normal', name: 'normal', title: 'Normal'}],
        lists: [],
        decorators: [],
        annotations: [],
        blockObjects: [],
        inlineObjects: [],
      })
    })
  })

  describe('field of', () => {
    test('of with object type is preserved on array fields', () => {
      expect(
        compileSchema({
          blockObjects: [
            {
              name: 'gallery',
              fields: [
                {
                  name: 'images',
                  type: 'array',
                  of: [
                    {
                      type: 'object',
                      name: 'galleryImage',
                      fields: [{name: 'alt', type: 'string'}],
                    },
                  ],
                },
              ],
            },
          ],
        }).blockObjects,
      ).toEqual([
        {
          name: 'gallery',
          fields: [
            {
              name: 'images',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'galleryImage',
                  fields: [{name: 'alt', type: 'string'}],
                },
              ],
            },
          ],
        },
      ])
    })

    test('of with block type resolves PTE sub-schema with inheritance', () => {
      expect(
        compileSchema({
          blockObjects: [
            {
              name: 'tableCell',
              fields: [
                {
                  name: 'content',
                  type: 'array',
                  of: [
                    {
                      type: 'block',
                      styles: [{name: 'normal'}, {name: 'h1'}],
                      decorators: [{name: 'strong'}],
                    },
                  ],
                },
              ],
            },
          ],
        }).blockObjects,
      ).toEqual([
        {
          name: 'tableCell',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [
                {
                  type: 'block',
                  styles: [
                    {name: 'normal', value: 'normal'},
                    {name: 'h1', value: 'h1'},
                  ],
                  decorators: [{name: 'strong', value: 'strong'}],
                  annotations: [],
                  lists: [],
                  inlineObjects: [],
                },
              ],
            },
          ],
        },
      ])
    })

    test('table schema: blockObjects with of containing block type', () => {
      const schema = compileSchema({
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
                    name: 'tableRow',
                    fields: [
                      {
                        name: 'cells',
                        type: 'array',
                        of: [{type: 'tableCell', name: 'tableCell'}],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      })

      expect(schema.blockObjects).toEqual([
        {
          name: 'table',
          fields: [
            {
              name: 'rows',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'tableRow',
                  fields: [
                    {
                      name: 'cells',
                      type: 'array',
                      of: [{type: 'tableCell', name: 'tableCell'}],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
  })

  describe('nested block inheritance', () => {
    test('nested block with no overrides inherits all root fields', () => {
      expect(
        compileSchema({
          styles: [{name: 'h1'}, {name: 'h2'}],
          decorators: [{name: 'strong'}, {name: 'em'}],
          annotations: [{name: 'link'}],
          lists: [{name: 'bullet'}],
          inlineObjects: [{name: 'mention'}],
          blockObjects: [
            {
              name: 'tableCell',
              fields: [
                {
                  name: 'content',
                  type: 'array',
                  of: [{type: 'block'}],
                },
              ],
            },
          ],
        }).blockObjects,
      ).toEqual([
        {
          name: 'tableCell',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [
                {
                  type: 'block',
                  styles: [
                    {name: 'normal', value: 'normal', title: 'Normal'},
                    {name: 'h1', value: 'h1'},
                    {name: 'h2', value: 'h2'},
                  ],
                  decorators: [
                    {name: 'strong', value: 'strong'},
                    {name: 'em', value: 'em'},
                  ],
                  annotations: [{name: 'link', fields: []}],
                  lists: [{name: 'bullet', value: 'bullet'}],
                  inlineObjects: [{name: 'mention', fields: []}],
                },
              ],
            },
          ],
        },
      ])
    })

    test('nested block overrides decorators and inherits the rest', () => {
      expect(
        compileSchema({
          styles: [{name: 'h1'}],
          decorators: [{name: 'strong'}, {name: 'em'}],
          annotations: [{name: 'link'}],
          blockObjects: [
            {
              name: 'tableCell',
              fields: [
                {
                  name: 'content',
                  type: 'array',
                  of: [
                    {
                      type: 'block',
                      decorators: [{name: 'strong'}],
                    },
                  ],
                },
              ],
            },
          ],
        }).blockObjects,
      ).toEqual([
        {
          name: 'tableCell',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [
                {
                  type: 'block',
                  styles: [
                    {name: 'normal', value: 'normal', title: 'Normal'},
                    {name: 'h1', value: 'h1'},
                  ],
                  decorators: [{name: 'strong', value: 'strong'}],
                  annotations: [{name: 'link', fields: []}],
                  lists: [],
                  inlineObjects: [],
                },
              ],
            },
          ],
        },
      ])
    })

    test('nested block declares its own inline objects', () => {
      expect(
        compileSchema({
          inlineObjects: [{name: 'rootMention'}],
          blockObjects: [
            {
              name: 'tableCell',
              fields: [
                {
                  name: 'content',
                  type: 'array',
                  of: [
                    {
                      type: 'block',
                      inlineObjects: [
                        {
                          name: 'cellMention',
                          fields: [{name: 'id', type: 'string'}],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        }).blockObjects,
      ).toEqual([
        {
          name: 'tableCell',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [
                {
                  type: 'block',
                  styles: [{name: 'normal', value: 'normal', title: 'Normal'}],
                  decorators: [],
                  annotations: [],
                  lists: [],
                  inlineObjects: [
                    {
                      name: 'cellMention',
                      fields: [{name: 'id', type: 'string'}],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })

    test('nested block with empty overrides replaces root values', () => {
      expect(
        compileSchema({
          decorators: [{name: 'strong'}],
          blockObjects: [
            {
              name: 'tableCell',
              fields: [
                {
                  name: 'content',
                  type: 'array',
                  of: [
                    {
                      type: 'block',
                      decorators: [],
                    },
                  ],
                },
              ],
            },
          ],
        }).blockObjects,
      ).toEqual([
        {
          name: 'tableCell',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [
                {
                  type: 'block',
                  styles: [{name: 'normal', value: 'normal', title: 'Normal'}],
                  decorators: [],
                  annotations: [],
                  lists: [],
                  inlineObjects: [],
                },
              ],
            },
          ],
        },
      ])
    })

    test('a nested block inherits the root when no enclosing container declares its own block', () => {
      expect(
        compileSchema({
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
        }).blockObjects,
      ).toEqual([
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
                                  styles: [
                                    {
                                      name: 'normal',
                                      value: 'normal',
                                      title: 'Normal',
                                    },
                                  ],
                                  decorators: [
                                    {name: 'strong', value: 'strong'},
                                  ],
                                  annotations: [],
                                  lists: [],
                                  inlineObjects: [],
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
      ])
    })

    test("a callout nested in a cell inherits the cell's overridden block, not the root", () => {
      // `table`/`row` are structural and declare no block of their own, so
      // they pass the root through. The `cell` overrides the root decorators
      // down to `strong`. A `callout` nested inside the cell omits
      // decorators, so it inherits the cell's `strong`, not the root's
      // `strong`/`em`/`code`.
      expect(
        compileSchema({
          decorators: [{name: 'strong'}, {name: 'em'}, {name: 'code'}],
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
                                    },
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
        }).blockObjects,
      ).toEqual([
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
                                  // The cell overrides the root: `strong` only.
                                  type: 'block',
                                  styles: [
                                    {
                                      name: 'normal',
                                      value: 'normal',
                                      title: 'Normal',
                                    },
                                  ],
                                  decorators: [
                                    {name: 'strong', value: 'strong'},
                                  ],
                                  annotations: [],
                                  lists: [],
                                  inlineObjects: [],
                                },
                                {
                                  type: 'object',
                                  name: 'callout',
                                  fields: [
                                    {
                                      name: 'content',
                                      type: 'array',
                                      of: [
                                        {
                                          // Inherits the cell's block, not the
                                          // root (which also allows `em`/`code`).
                                          type: 'block',
                                          styles: [
                                            {
                                              name: 'normal',
                                              value: 'normal',
                                              title: 'Normal',
                                            },
                                          ],
                                          decorators: [
                                            {name: 'strong', value: 'strong'},
                                          ],
                                          annotations: [],
                                          lists: [],
                                          inlineObjects: [],
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
        },
      ])
    })

    test('a nested block inherits the nearest declaring container, not a more distant one', () => {
      // `outer` declares `[strong, em]`; `inner` (nested in outer) declares
      // `[strong]`; `leaf` (nested in inner) declares nothing. The leaf block
      // resolves to `inner`'s `[strong]` (the nearest declaring container),
      // not `outer`'s `[strong, em]` and not the root's `[strong, em, code]`.
      expect(
        compileSchema({
          decorators: [{name: 'strong'}, {name: 'em'}, {name: 'code'}],
          blockObjects: [
            {
              name: 'outer',
              fields: [
                {
                  name: 'content',
                  type: 'array',
                  of: [
                    {
                      type: 'block',
                      decorators: [{name: 'strong'}, {name: 'em'}],
                    },
                    {
                      type: 'object',
                      name: 'inner',
                      fields: [
                        {
                          name: 'content',
                          type: 'array',
                          of: [
                            {type: 'block', decorators: [{name: 'strong'}]},
                            {
                              type: 'object',
                              name: 'leaf',
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
        }).blockObjects,
      ).toEqual([
        {
          name: 'outer',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [
                {
                  type: 'block',
                  styles: [{name: 'normal', value: 'normal', title: 'Normal'}],
                  decorators: [
                    {name: 'strong', value: 'strong'},
                    {name: 'em', value: 'em'},
                  ],
                  annotations: [],
                  lists: [],
                  inlineObjects: [],
                },
                {
                  type: 'object',
                  name: 'inner',
                  fields: [
                    {
                      name: 'content',
                      type: 'array',
                      of: [
                        {
                          type: 'block',
                          styles: [
                            {name: 'normal', value: 'normal', title: 'Normal'},
                          ],
                          decorators: [{name: 'strong', value: 'strong'}],
                          annotations: [],
                          lists: [],
                          inlineObjects: [],
                        },
                        {
                          type: 'object',
                          name: 'leaf',
                          fields: [
                            {
                              name: 'content',
                              type: 'array',
                              of: [
                                {
                                  // Inherits `inner` (nearest), not `outer`
                                  // or the root.
                                  type: 'block',
                                  styles: [
                                    {
                                      name: 'normal',
                                      value: 'normal',
                                      title: 'Normal',
                                    },
                                  ],
                                  decorators: [
                                    {name: 'strong', value: 'strong'},
                                  ],
                                  annotations: [],
                                  lists: [],
                                  inlineObjects: [],
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
      ])
    })
  })

  test('compiles a shared of member once per block inheritance', () => {
    const fieldReads: Record<string, number> = {}
    let member = createCountingMember(
      't3',
      [{name: 'value', type: 'string'}],
      fieldReads,
    )
    for (let index = 2; index >= 0; index--) {
      member = createCountingMember(
        `t${index}`,
        [
          {name: 'first', type: 'array', of: [member]},
          {name: 'second', type: 'array', of: [member]},
        ],
        fieldReads,
      )
    }

    compileSchema({
      blockObjects: [
        {
          name: 'root',
          fields: [{name: 'content', type: 'array', of: [member]}],
        },
      ],
    })

    expect(fieldReads).toEqual({t0: 1, t1: 1, t2: 1, t3: 1})
  })

  test('shared compilation is structurally equal to compiling the same input as a tree', () => {
    const definition = createSharedTypeDefinition(8)
    const expandedDefinition = JSON.parse(
      JSON.stringify(definition),
    ) as SchemaDefinition

    expect(compileSchema(definition)).toEqual(compileSchema(expandedDefinition))
  })

  test('compiles self-recursive and mutually recursive definition objects', () => {
    const self: InlineObjectOfDefinition = {
      type: 'object',
      name: 'self',
      fields: [],
    }
    const left: InlineObjectOfDefinition = {
      type: 'object',
      name: 'left',
      fields: [],
    }
    const right: InlineObjectOfDefinition = {
      type: 'object',
      name: 'right',
      fields: [],
    }
    Object.assign(self, {
      fields: [{name: 'children', type: 'array', of: [self]}],
    })
    Object.assign(left, {
      fields: [{name: 'children', type: 'array', of: [right]}],
    })
    Object.assign(right, {
      fields: [{name: 'children', type: 'array', of: [left]}],
    })

    const compiled = compileSchema({blockObjects: [self, left, right]})
    const compiledSelf = compiled.blockObjects[0]!
    const compiledLeft = compiled.blockObjects[1]!
    const compiledRight = compiled.blockObjects[2]!

    expect(compiledSelf.fields[0]).toEqual({
      name: 'children',
      type: 'array',
      of: [compiledSelf],
    })
    expect(compiledLeft.fields[0]).toEqual({
      name: 'children',
      type: 'array',
      of: [compiledRight],
    })
    expect(compiledRight.fields[0]).toEqual({
      name: 'children',
      type: 'array',
      of: [compiledLeft],
    })
  })

  test('compiles a shared root object without `type` when it is also an of-member', () => {
    const recursiveObject = {
      name: 'recursiveObject',
      fields: [] as Array<FieldDefinition>,
    }
    recursiveObject.fields = [
      {
        name: 'children',
        type: 'array',
        of: [recursiveObject as unknown as OfDefinition],
      },
    ]

    const compiled = compileSchema({blockObjects: [recursiveObject]})

    expect(compiled.blockObjects[0]!.fields[0]).toEqual({
      name: 'children',
      type: 'array',
      of: [compiled.blockObjects[0]],
    })
  })

  test('a block re-entered through its own inline object keeps its inline objects', () => {
    const block: BlockOfDefinition = {type: 'block', inlineObjects: []}
    const note = {
      name: 'note',
      fields: [{name: 'body', type: 'array', of: [block]}],
    }
    Object.assign(block, {inlineObjects: [note]})

    const compiled = compileSchema({
      blockObjects: [
        {name: 'card', fields: [{name: 'body', type: 'array', of: [block]}]},
      ],
    })
    const compiledBlock = (
      compiled.blockObjects[0]!.fields[0] as {of: ReadonlyArray<OfDefinition>}
    ).of[0] as BlockOfDefinition

    expect(compiledBlock.inlineObjects).toEqual([
      {
        name: 'note',
        fields: [{name: 'body', type: 'array', of: [compiledBlock]}],
      },
    ])
  })

  test('compiles a recursive object next to a block member without overrides', () => {
    const container = {
      name: 'container',
      fields: [] as Array<FieldDefinition>,
    }
    container.fields = [
      {
        name: 'content',
        type: 'array',
        of: [{type: 'block'}, container as unknown as OfDefinition],
      },
    ]

    const compiled = compileSchema({blockObjects: [container]})

    expect(compiled.blockObjects[0]!.fields[0]).toEqual({
      name: 'content',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
          decorators: [],
          annotations: [],
          lists: [],
          inlineObjects: [],
        },
        compiled.blockObjects[0],
      ],
    })
  })

  test('compiles a recursive object next to a block member that overrides its styles', () => {
    const container = {
      name: 'container',
      fields: [] as Array<FieldDefinition>,
    }
    container.fields = [
      {
        name: 'content',
        type: 'array',
        of: [
          {type: 'block', styles: [{name: 'code'}]},
          container as unknown as OfDefinition,
        ],
      },
    ]

    const compiled = compileSchema({blockObjects: [container]})

    expect(compiled.blockObjects[0]!.fields[0]).toEqual({
      name: 'content',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [{name: 'code', value: 'code'}],
          decorators: [],
          annotations: [],
          lists: [],
          inlineObjects: [],
        },
        compiled.blockObjects[0],
      ],
    })
  })

  test.fails('compiles a recursive object next to a block member that overrides its annotations', () => {
    const container = {
      name: 'container',
      fields: [] as Array<FieldDefinition>,
    }
    container.fields = [
      {
        name: 'content',
        type: 'array',
        of: [
          {type: 'block', annotations: [{name: 'link'}]},
          container as unknown as OfDefinition,
        ],
      },
    ]

    const compiled = compileSchema({blockObjects: [container]})

    expect(compiled.blockObjects[0]!.fields[0]).toEqual({
      name: 'content',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
          decorators: [],
          annotations: [{name: 'link', fields: []}],
          lists: [],
          inlineObjects: [],
        },
        compiled.blockObjects[0],
      ],
    })
  })

  test('compiles a diamond graph with one object per definition and inheritance', () => {
    const definition = createSharedTypeDefinition(30)
    const compiled = compileSchema(definition)

    expect(countDistinctObjects(compiled)).toBeLessThan(200)
  })
})

function createCountingMember(
  name: string,
  fields: InlineObjectOfDefinition['fields'],
  fieldReads: Record<string, number>,
): InlineObjectOfDefinition {
  const member: InlineObjectOfDefinition = {type: 'object', name, fields}
  Object.defineProperty(member, 'fields', {
    enumerable: false,
    get: () => {
      fieldReads[name] = (fieldReads[name] ?? 0) + 1
      return fields
    },
  })
  return member
}

function createSharedTypeDefinition(typeCount: number): SchemaDefinition {
  let member: InlineObjectOfDefinition = {
    type: 'object',
    name: `t${typeCount - 1}`,
    fields: [{name: 'value', type: 'string'}],
  }

  for (let index = typeCount - 2; index >= 0; index--) {
    member = {
      type: 'object',
      name: `t${index}`,
      fields: [
        {name: 'first', type: 'array', of: [member]},
        {name: 'second', type: 'array', of: [member]},
      ],
    }
  }

  return {
    blockObjects: [
      {
        name: 'root',
        fields: [{name: 'content', type: 'array', of: [member]}],
      },
    ],
  }
}

function countDistinctObjects(
  value: unknown,
  seen = new Set<object>(),
): number {
  if (typeof value !== 'object' || value === null || seen.has(value)) {
    return 0
  }
  seen.add(value)
  return (
    1 +
    Object.values(value).reduce(
      (count, child) => count + countDistinctObjects(child, seen),
      0,
    )
  )
}
