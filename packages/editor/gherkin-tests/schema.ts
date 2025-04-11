import {defineSchema} from '../src/editor/editor-schema'

export const schemaDefinition = defineSchema({
  annotations: [
    {
      name: 'comment',
      fields: [{name: 'text', type: 'string'}],
    },
    {
      name: 'link',
      fields: [{name: 'href', type: 'string'}],
    },
  ],
  decorators: [{name: 'strong'}, {name: 'em'}],
  styles: [
    {name: 'normal'},
    {name: 'h1'},
    {name: 'h2'},
    {name: 'h3'},
    {name: 'h4'},
    {name: 'h5'},
    {name: 'h6'},
    {name: 'blockquote'},
  ],
  lists: [{name: 'bullet'}, {name: 'number'}],
  blockObjects: [
    {
      name: 'image',
      fields: [{name: 'url', type: 'string'}],
    },
  ],
  inlineObjects: [
    {
      name: 'stock-ticker',
      fields: [{name: 'symbol', type: 'string'}],
    },
  ],
})
