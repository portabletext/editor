import {compileSchema, defineSchema} from '@portabletext/schema'

const customSchema = compileSchema(
  defineSchema({
    styles: [{name: 'normal'}, {name: 'h1'}, {name: 'h2'}],
    lists: [{name: 'number'}],
    decorators: [
      {name: 'strong'},
      {name: 'em'},
      {name: 'code'},
      {name: 'strike-through'},
      {name: 'highlight'},
      {name: 'sub'},
      {name: 'sup'},
      {name: 'mark'},
      {name: 'ins'},
      {name: 'small'},
    ],
    annotations: [{name: 'author'}],
  }),
)

export default customSchema
