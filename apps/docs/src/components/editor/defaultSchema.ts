import {defineSchema} from '@portabletext/editor'

export const defaultSchema = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}, {name: 'underline'}],
  annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
  styles: [
    {name: 'normal'},
    {name: 'h1'},
    {name: 'h2'},
    {name: 'h3'},
    {name: 'blockquote'},
  ],
  lists: [{name: 'bullet'}, {name: 'number'}],
  inlineObjects: [{name: 'stock-ticker'}],
  blockObjects: [{name: 'image'}],
})
