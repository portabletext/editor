import {compileSchema, defineSchema} from '@portabletext/schema'
import type {BlockTestFn} from '../types'

const customSchema = compileSchema(
  defineSchema({
    block: {name: 'customBlock'},
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

const testFn: BlockTestFn = (html, tools, commonOptions) => {
  return tools.htmlToPortableText(html, {
    schema: customSchema,
    ...commonOptions,
  })
}

export default testFn
