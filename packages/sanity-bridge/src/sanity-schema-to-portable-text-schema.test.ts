import type {Schema} from '@portabletext/schema'
import {Schema as SanitySchema} from '@sanity/schema'
import {builtinTypes} from '@sanity/schema/_internal'
import {
  defineArrayMember,
  defineField,
  defineType,
  type ArrayDefinition,
} from '@sanity/types'
import {describe, expect, test} from 'vitest'
import {sanitySchemaToPortableTextSchema} from './sanity-schema-to-portable-text-schema'

describe(sanitySchemaToPortableTextSchema.name, () => {
  const defaultSchema: Schema = {
    block: {
      name: 'block',
    },
    span: {
      name: 'span',
    },
    styles: [
      {
        name: 'normal',
        value: 'normal',
        title: 'Normal',
      },
      {
        name: 'h1',
        value: 'h1',
        title: 'Heading 1',
      },
      {
        name: 'h2',
        value: 'h2',
        title: 'Heading 2',
      },
      {
        name: 'h3',
        value: 'h3',
        title: 'Heading 3',
      },
      {
        name: 'h4',
        value: 'h4',
        title: 'Heading 4',
      },
      {
        name: 'h5',
        value: 'h5',
        title: 'Heading 5',
      },
      {
        name: 'h6',
        value: 'h6',
        title: 'Heading 6',
      },
      {
        name: 'blockquote',
        value: 'blockquote',
        title: 'Quote',
      },
    ],
    lists: [
      {
        name: 'bullet',
        value: 'bullet',
        title: 'Bulleted list',
      },
      {
        name: 'number',
        value: 'number',
        title: 'Numbered list',
      },
    ],
    decorators: [
      {
        name: 'strong',
        value: 'strong',
        title: 'Strong',
      },
      {
        name: 'em',
        value: 'em',
        title: 'Italic',
      },
      {
        name: 'code',
        value: 'code',
        title: 'Code',
      },
      {
        name: 'underline',
        value: 'underline',
        title: 'Underline',
      },
      {
        name: 'strike-through',
        value: 'strike-through',
        title: 'Strike',
      },
    ],
    annotations: [
      {
        name: 'link',
        title: 'Link',
        fields: [
          {
            name: 'href',
            type: 'string',
            title: 'Link',
          },
        ],
      },
    ],
    blockObjects: [],
    inlineObjects: [],
  }

  test('simple compiled schema', () => {
    const sanitySchema = SanitySchema.compile({
      name: 'test',
      types: [
        defineArrayMember({
          type: 'array',
          name: 'content',
          of: [defineField({type: 'block', name: 'block'})],
        }),
      ],
    })

    expect(
      sanitySchemaToPortableTextSchema(sanitySchema.get('content')),
    ).toEqual(defaultSchema)
  })

  test('schema with built-in types', () => {
    const sanitySchema = SanitySchema.compile({
      name: 'test',
      types: [
        defineArrayMember({
          type: 'array',
          name: 'content',
          of: [
            defineField({
              type: 'block',
              name: 'block',
            }),
            defineField({type: 'image', name: 'image'}),
          ],
        }),
        ...builtinTypes,
      ],
    })

    expect(
      sanitySchemaToPortableTextSchema(sanitySchema.get('content'))
        .blockObjects,
    ).toEqual([
      {
        name: 'image',
        title: 'Image',
        fields: [
          {
            name: 'asset',
            title: 'Asset',
            type: 'object',
          },
          {
            name: 'media',
            title: 'Media',
            type: 'object',
          },
          {
            name: 'hotspot',
            title: 'Hotspot',
            type: 'object',
          },
          {
            name: 'crop',
            title: 'Crop',
            type: 'object',
          },
        ],
      },
    ])
  })

  test('simple array definition', () => {
    const sanitySchema: ArrayDefinition = {
      type: 'array',
      name: 'content',
      of: [defineField({type: 'block', name: 'block'})],
    }

    expect(sanitySchemaToPortableTextSchema(sanitySchema)).toEqual(
      defaultSchema,
    )
  })

  test('array definition with image', () => {
    const sanitySchema: ArrayDefinition = {
      type: 'array',
      name: 'content',
      of: [
        defineField({type: 'block', name: 'block'}),
        defineField({type: 'image', name: 'image'}),
      ],
    }

    expect(sanitySchemaToPortableTextSchema(sanitySchema)).toEqual({
      ...defaultSchema,
      blockObjects: [
        ...defaultSchema.blockObjects,
        {
          name: 'image',
          title: 'Image',
          fields: [
            {
              name: 'asset',
              title: 'Asset',
              type: 'object',
            },
            {
              name: 'media',
              title: 'Media',
              type: 'object',
            },
            {
              name: 'hotspot',
              title: 'Hotspot',
              type: 'object',
            },
            {
              name: 'crop',
              title: 'Crop',
              type: 'object',
            },
          ],
        },
      ],
    })
  })

  test('compiled schema with custom block and inline objects', () => {
    const imageType = defineType({
      name: 'custom image',
      type: 'object',
      fields: [
        defineField({
          name: 'url',
          type: 'string',
        }),
      ],
    })
    const stockTickerType = defineType({
      name: 'stock ticker',
      type: 'object',
      fields: [defineField({name: 'symbol', type: 'string'})],
    })
    const portableTextType = defineType({
      type: 'array',
      name: 'body',
      of: [
        {
          type: 'block',
          name: 'block',
          of: [{type: 'stock ticker'}],
        },
        {type: 'custom image'},
      ],
    })

    const sanitySchema = SanitySchema.compile({
      types: [portableTextType, imageType, stockTickerType],
    })

    const schema = sanitySchemaToPortableTextSchema(sanitySchema.get('body'))

    expect(schema.blockObjects).toEqual([
      {
        name: 'custom image',
        title: 'Custom Image',
        fields: [
          {
            name: 'url',
            title: 'Url',
            type: 'string',
          },
        ],
      },
    ])
    expect(schema.inlineObjects).toEqual([
      {
        name: 'stock ticker',
        title: 'Stock Ticker',
        fields: [
          {
            name: 'symbol',
            title: 'Symbol',
            type: 'string',
          },
        ],
      },
    ])
  })

  test('compiled schema with a deep non-recursive structure unfolds fully', () => {
    // table-like nesting: table -> row -> cell -> block
    const cellType = defineType({
      type: 'object',
      name: 'cell',
      fields: [
        defineField({
          type: 'array',
          name: 'content',
          of: [defineArrayMember({type: 'block', name: 'block'})],
        }),
      ],
    })
    const rowType = defineType({
      type: 'object',
      name: 'row',
      fields: [
        defineField({
          type: 'array',
          name: 'cells',
          of: [defineArrayMember({type: 'cell'})],
        }),
      ],
    })
    const tableType = defineType({
      type: 'object',
      name: 'table',
      fields: [
        defineField({
          type: 'array',
          name: 'rows',
          of: [defineArrayMember({type: 'row'})],
        }),
      ],
    })
    const portableTextType = defineType({
      type: 'array',
      name: 'body',
      of: [
        defineArrayMember({type: 'block', name: 'block'}),
        defineArrayMember({type: 'table'}),
      ],
    })

    const sanitySchema = SanitySchema.compile({
      types: [portableTextType, tableType, rowType, cellType],
    })

    const schema = sanitySchemaToPortableTextSchema(sanitySchema.get('body'))
    const table = schema.blockObjects?.find((b) => b.name === 'table')

    expect(table?.fields).toEqual([
      {
        name: 'rows',
        type: 'array',
        title: 'Rows',
        of: [
          {
            type: 'row',
            name: 'row',
            title: 'Row',
            fields: [
              {
                name: 'cells',
                type: 'array',
                title: 'Cells',
                of: [
                  {
                    type: 'cell',
                    name: 'cell',
                    title: 'Cell',
                    fields: [
                      {
                        name: 'content',
                        type: 'array',
                        title: 'Content',
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
    ])
  })

  test('compiled schema with a deeply nested table that contains itself in cells unfolds until the recursion is detected', () => {
    const cellType = defineType({
      type: 'object',
      name: 'cell',
      fields: [
        defineField({
          type: 'array',
          name: 'content',
          of: [
            defineArrayMember({type: 'block', name: 'block'}),
            defineArrayMember({type: 'table'}),
          ],
        }),
      ],
    })
    const rowType = defineType({
      type: 'object',
      name: 'row',
      fields: [
        defineField({
          type: 'array',
          name: 'cells',
          of: [defineArrayMember({type: 'cell'})],
        }),
      ],
    })
    const tableType = defineType({
      type: 'object',
      name: 'table',
      fields: [
        defineField({
          type: 'array',
          name: 'rows',
          of: [defineArrayMember({type: 'row'})],
        }),
      ],
    })
    const portableTextType = defineType({
      type: 'array',
      name: 'body',
      of: [
        defineArrayMember({type: 'block', name: 'block'}),
        defineArrayMember({type: 'table'}),
      ],
    })

    const sanitySchema = SanitySchema.compile({
      types: [portableTextType, tableType, rowType, cellType],
    })

    const schema = sanitySchemaToPortableTextSchema(sanitySchema.get('body'))
    const table = schema.blockObjects?.find((b) => b.name === 'table')

    // The nested `table` member inside a cell's `content` is detected as
    // a cycle (its name is already an ancestor on the walk) and emitted
    // as a stub `{type, name, title}` without fields. Everything before
    // that point unfolds fully.
    expect(table?.fields).toEqual([
      {
        name: 'rows',
        type: 'array',
        title: 'Rows',
        of: [
          {
            type: 'row',
            name: 'row',
            title: 'Row',
            fields: [
              {
                name: 'cells',
                type: 'array',
                title: 'Cells',
                of: [
                  {
                    type: 'cell',
                    name: 'cell',
                    title: 'Cell',
                    fields: [
                      {
                        name: 'content',
                        type: 'array',
                        title: 'Content',
                        of: [
                          {type: 'block'},
                          {type: 'table', name: 'table', title: 'Table'},
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

  test('compiled schema with a recursive object type unfolds until the recursion is detected', () => {
    // canvas's `canvasAiTask` shape: a block-object whose `input` field is
    // an array that contains the same type as a member, so the hydrated
    // sanity schema is a cycle.
    const aiTaskType = defineType({
      type: 'object',
      name: 'aiTask',
      fields: [
        defineField({name: 'instruction', type: 'string'}),
        defineField({
          type: 'array',
          name: 'input',
          of: [
            defineArrayMember({type: 'block', name: 'block'}),
            defineArrayMember({type: 'aiTask'}),
          ],
        }),
      ],
    })
    const portableTextType = defineType({
      type: 'array',
      name: 'body',
      of: [
        defineArrayMember({type: 'block', name: 'block'}),
        defineArrayMember({type: 'aiTask'}),
      ],
    })

    const sanitySchema = SanitySchema.compile({
      types: [portableTextType, aiTaskType],
    })

    const schema = sanitySchemaToPortableTextSchema(sanitySchema.get('body'))
    const aiTask = schema.blockObjects?.find((b) => b.name === 'aiTask')

    // The nested `aiTask` reference inside `input.of` is detected as a
    // cycle (its name is already an ancestor on the walk) and emitted
    // as a stub `{type, name, title}` without fields.
    expect(aiTask?.fields).toEqual([
      {name: 'instruction', type: 'string', title: 'Instruction'},
      {
        name: 'input',
        type: 'array',
        title: 'Input',
        of: [
          {type: 'block'},
          {type: 'aiTask', name: 'aiTask', title: 'Ai Task'},
        ],
      },
    ])
  })
})
