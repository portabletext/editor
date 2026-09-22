import {defineArrayMember, defineField} from 'sanity'

export const callout = defineArrayMember({
  type: 'object',
  name: 'callout',
  fields: [
    defineField({
      name: 'text',
      type: 'string',
    }),
  ],
})
