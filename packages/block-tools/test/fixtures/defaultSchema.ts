import {compileSchema, defineSchema} from '@portabletext/schema'

const defaultSchema = compileSchema(
  defineSchema({
    decorators: [
      {name: 'strong'},
      {name: 'em'},
      {name: 'underline'},
      {name: 'strike-through'},
      {name: 'code'},
    ],
    annotations: [{name: 'link'}],
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
        name: 'code',
        fields: [
          {name: 'code', type: 'string'},
          {name: 'language', type: 'string'},
        ],
      },
    ],
  }),
)

export default defaultSchema
