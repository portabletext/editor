import {describe, expect, test, vi} from 'vitest'
import {compileSchema} from './compile-schema'

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
})
