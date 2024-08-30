import {Schema} from '@sanity/schema'
import {defineField, defineType} from '@sanity/types'

export const imageType = defineType({
  name: 'image',
  title: 'Image',
  type: 'object',
  fields: [
    defineField({
      name: 'url',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
  ],
})

const stockTickerType = defineType({
  name: 'stock-ticker',
  type: 'object',
  fields: [
    defineField({
      name: 'symbol',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
  ],
})

export const someObject = {
  type: 'object',
  name: 'someObject',
  fields: [{type: 'string', name: 'color'}],
}

export const portableTextType = defineType({
  type: 'array',
  name: 'body',
  of: [
    {
      type: 'block',
      name: 'block',
      styles: [
        {title: 'Normal', value: 'normal'},
        {title: 'H1', value: 'h1'},
        {title: 'H2', value: 'h2'},
        {title: 'H3', value: 'h3'},
        {title: 'H4', value: 'h4'},
        {title: 'H5', value: 'h5'},
        {title: 'H6', value: 'h6'},
        {title: 'Quote', value: 'blockquote'},
      ],
      marks: {
        annotations: [
          {
            name: 'comment',
            type: 'object',
            fields: [{type: 'string', name: 'text'}],
          },
        ],
      },
      of: [someObject, {type: 'stock-ticker'}],
    },
    someObject,
    {type: 'image'},
  ],
})

export const schema = Schema.compile({
  types: [portableTextType, imageType, someObject, stockTickerType],
}).get('body')
