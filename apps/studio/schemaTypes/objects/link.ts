import {defineArrayMember, defineField} from 'sanity'

export const link = defineArrayMember({
  type: 'object',
  name: 'link',
  fields: [
    defineField({
      name: 'href',
      type: 'string',
    }),
  ],
})
