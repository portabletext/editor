import {defineField, defineType} from 'sanity'

export const blogPostType = defineType({
  name: 'blog-post',
  title: 'Blog post',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'content',
      type: 'array',
      of: [{type: 'block', of: [{type: 'stock-ticker'}]}, {type: 'break'}],
    }),
  ],
})

export const breakType = defineType({
  name: 'break',
  type: 'object',
  fields: [
    defineField({
      name: 'style',
      type: 'string',
      options: {
        list: ['break'],
      },
      validation: (Rule) => Rule.required(),
    }),
  ],
})

export const stockTickerType = defineType({
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
