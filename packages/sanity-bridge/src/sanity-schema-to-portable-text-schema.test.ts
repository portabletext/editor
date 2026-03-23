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
})
