import {defineSchema} from '@portabletext/editor'

export const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}, {name: 'underline'}],
  annotations: [{name: 'link'}],
  styles: [
    {name: 'normal'},
    {name: 'h1'},
    {name: 'h2'},
    {name: 'h3'},
    {name: 'blockqoute'},
  ],
  lists: [{name: 'bullet'}, {name: 'number'}],
  inlineObjects: [{name: 'stock-ticker'}],
  blockObjects: [{name: 'image'}],
})
