import {compileSchema, defineSchema} from '@portabletext/schema'

const defaultSchema = compileSchema(
  defineSchema({
    annotations: [{name: 'link'}],
    decorators: [
      {name: 'strong'},
      {name: 'em'},
      {name: 'code'},
      {name: 'underline'},
      {name: 'strike-through'},
    ],
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
      {name: 'image', fields: [{name: 'src', type: 'string'}]},
      {
        name: 'code',
        fields: [
          {name: 'code', type: 'string'},
          {name: 'language', type: 'string'},
        ],
      },
    ],
    inlineObjects: [{name: 'image', fields: [{name: 'src', type: 'string'}]}],
  }),
)

export default defaultSchema
