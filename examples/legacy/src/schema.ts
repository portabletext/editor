import {Schema} from '@sanity/schema'
import {defineField, defineType} from '@sanity/types'

const imageType = defineType({
  name: 'custom image',
  title: 'Image',
  type: 'object',
  fields: [
    defineField({
      name: 'url',
      type: 'string',
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
    }),
  ],
})

const portableTextType = defineType({
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
          {
            name: 'link',
            type: 'object',
            fields: [{type: 'string', name: 'href'}],
          },
        ],
      },
      of: [{type: 'stock-ticker'}],
    },
    {type: 'custom image'},
  ],
})

export const schema = Schema.compile({
  types: [portableTextType, imageType, stockTickerType],
}).get('body')
