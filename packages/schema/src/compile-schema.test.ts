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
                      type: 'galleryImage',
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
                  type: 'galleryImage',
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
                    type: 'tableRow',
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
                  type: 'tableRow',
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

    test('nested block with empty styles override resolves to an empty list', () => {
      expect(
        compileSchema({
          styles: [{name: 'h1'}, {name: 'h2'}],
          decorators: [{name: 'strong'}],
          blockObjects: [
            {
              name: 'codeBlock',
              fields: [
                {
                  name: 'lines',
                  type: 'array',
                  of: [
                    {
                      type: 'block',
                      styles: [],
                      decorators: [],
                      annotations: [],
                      lists: [],
                      inlineObjects: [],
                    },
                  ],
                },
              ],
            },
          ],
        }).blockObjects,
      ).toEqual([
        {
          name: 'codeBlock',
          fields: [
            {
              name: 'lines',
              type: 'array',
              of: [
                {
                  type: 'block',
                  styles: [],
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

    test('deeply nested blocks inherit from root, not from intermediate containers', () => {
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
                      type: 'row',
                      name: 'row',
                      fields: [
                        {
                          name: 'cells',
                          type: 'array',
                          of: [
                            {
                              type: 'cell',
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
                  type: 'row',
                  name: 'row',
                  fields: [
                    {
                      name: 'cells',
                      type: 'array',
                      of: [
                        {
                          type: 'cell',
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
  })
})
