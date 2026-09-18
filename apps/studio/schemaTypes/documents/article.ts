import {defineArrayMember, defineField, defineType} from 'sanity'
import {callout} from '../objects/callout'
import {link} from '../objects/link'
import {stockTicker} from '../objects/stock-ticker'

export const article = defineType({
  type: 'document',
  name: 'article',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
    }),
    defineField({
      name: 'lockBody',
      type: 'boolean',
    }),
    defineField({
      name: 'body',
      type: 'array',
      readOnly: ({document}) => Boolean(document?.lockBody),
      of: [
        defineArrayMember({
          type: 'block',
          marks: {
            decorators: [
              {title: 'Strong', value: 'strong'},
              {title: 'Emphasis', value: 'em'},
            ],
            annotations: [link],
          },
          of: [stockTicker],
        }),
        callout,
      ],
    }),
  ],
})
