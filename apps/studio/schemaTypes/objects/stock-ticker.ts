import {defineArrayMember, defineField} from 'sanity'

export const stockTicker = defineArrayMember({
  type: 'object',
  name: 'stockTicker',
  fields: [
    defineField({
      name: 'symbol',
      type: 'string',
    }),
  ],
})
