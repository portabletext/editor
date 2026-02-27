import {compileSchema, defineSchema} from '@portabletext/schema'

/**
 * Default schema matching the Sanity `{type: 'block'}` defaults:
 * - All standard styles (normal, h1-h6, blockquote)
 * - All standard decorators (strong, em, code, underline, strike-through)
 * - Bullet and number lists
 * - Link annotation
 * - Code block object (matching the old defaultSchema fixture)
 */
export const defaultSchema = compileSchema(
  defineSchema({
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
    decorators: [
      {name: 'strong'},
      {name: 'em'},
      {name: 'code'},
      {name: 'underline'},
      {name: 'strike-through'},
    ],
    annotations: [{name: 'link'}],
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

/**
 * Custom schema with restricted styles, only numbered lists, and extra decorators.
 * Matches the old customSchema fixture.
 */
export const customSchema = compileSchema(
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
