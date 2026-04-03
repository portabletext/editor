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

    test('of with block type preserves PTE sub-schema', () => {
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
                  styles: [{name: 'normal'}, {name: 'h1'}],
                  decorators: [{name: 'strong'}],
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

  describe('per-style restrictions', () => {
    test('style with decorator restrictions compiles correctly', () => {
      const schema = compileSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
        styles: [
          {name: 'normal'},
          {name: 'h1', decorators: [], annotations: []},
        ],
      })

      const h1Style = schema.styles.find((s) => s.name === 'h1')
      const normalStyle = schema.styles.find((s) => s.name === 'normal')

      expect(h1Style?.decorators).toEqual([])
      expect(h1Style?.annotations).toEqual([])
      expect(normalStyle?.decorators).toBeUndefined()
      expect(normalStyle?.annotations).toBeUndefined()
    })

    test('style with partial decorator restrictions compiles correctly', () => {
      const schema = compileSchema({
        decorators: [{name: 'strong'}, {name: 'em'}, {name: 'underline'}],
        styles: [
          {name: 'normal'},
          {name: 'h2', decorators: [{name: 'em'}]},
        ],
      })

      const h2Style = schema.styles.find((s) => s.name === 'h2')

      expect(h2Style?.decorators).toEqual([
        {name: 'em', value: 'em'},
      ])
    })

    test('style restrictions resolve full types from top-level definitions', () => {
      const schema = compileSchema({
        annotations: [
          {name: 'link', fields: [{name: 'href', type: 'string'}]},
          {name: 'comment', fields: [{name: 'text', type: 'string'}]},
        ],
        styles: [
          {name: 'normal'},
          {name: 'blockquote', annotations: [{name: 'link'}]},
        ],
      })

      const bqStyle = schema.styles.find((s) => s.name === 'blockquote')

      expect(bqStyle?.annotations).toEqual([
        {name: 'link', fields: [{name: 'href', type: 'string'}]},
      ])
    })

    test('style with list and inline object restrictions', () => {
      const schema = compileSchema({
        lists: [{name: 'bullet'}, {name: 'number'}],
        inlineObjects: [{name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]}],
        styles: [
          {name: 'normal'},
          {name: 'h1', lists: [], inlineObjects: []},
        ],
      })

      const h1Style = schema.styles.find((s) => s.name === 'h1')

      expect(h1Style?.lists).toEqual([])
      expect(h1Style?.inlineObjects).toEqual([])
    })

    test('styles without restrictions are unchanged', () => {
      const schema = compileSchema({
        decorators: [{name: 'strong'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
      })

      const normalStyle = schema.styles.find((s) => s.name === 'normal')
      const h1Style = schema.styles.find((s) => s.name === 'h1')

      expect(normalStyle?.decorators).toBeUndefined()
      expect(h1Style?.decorators).toBeUndefined()
    })
  })
})
