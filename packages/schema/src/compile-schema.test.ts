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
        containers: [],
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
        containers: [],
      })
    })
  })

  describe('containers', () => {
    test('empty schema has containers: []', () => {
      expect(compileSchema({})).toEqual({
        block: {name: 'block'},
        span: {name: 'span'},
        styles: [{value: 'normal', name: 'normal', title: 'Normal'}],
        lists: [],
        decorators: [],
        annotations: [],
        blockObjects: [],
        inlineObjects: [],
        containers: [],
      })
    })

    test('containers are compiled with fields defaulting to []', () => {
      expect(
        compileSchema({
          containers: [{name: 'tableCell'}],
        }),
      ).toEqual({
        block: {name: 'block'},
        span: {name: 'span'},
        styles: [{value: 'normal', name: 'normal', title: 'Normal'}],
        lists: [],
        decorators: [],
        annotations: [],
        blockObjects: [],
        inlineObjects: [],
        containers: [{name: 'tableCell', fields: []}],
      })
    })

    test('containers with fields are compiled', () => {
      expect(
        compileSchema({
          containers: [
            {
              name: 'tableCell',
              fields: [
                {name: 'colspan', type: 'number'},
                {name: 'rowspan', type: 'number'},
              ],
            },
          ],
        }),
      ).toEqual({
        block: {name: 'block'},
        span: {name: 'span'},
        styles: [{value: 'normal', name: 'normal', title: 'Normal'}],
        lists: [],
        decorators: [],
        annotations: [],
        blockObjects: [],
        inlineObjects: [],
        containers: [
          {
            name: 'tableCell',
            fields: [
              {name: 'colspan', type: 'number'},
              {name: 'rowspan', type: 'number'},
            ],
          },
        ],
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
          containers: [
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
        }).containers,
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

    test('table schema: blockObjects with of, containers with block of', () => {
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
        containers: [
          {
            name: 'tableCell',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [
                  {
                    type: 'block',
                    styles: [{name: 'normal'}],
                    lists: [],
                  },
                ],
              },
              {name: 'colspan', type: 'number'},
            ],
          },
        ],
      })

      expect(schema.containers).toEqual([
        {
          name: 'tableCell',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [
                {
                  type: 'block',
                  styles: [{name: 'normal'}],
                  lists: [],
                },
              ],
            },
            {name: 'colspan', type: 'number'},
          ],
        },
      ])

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
})
