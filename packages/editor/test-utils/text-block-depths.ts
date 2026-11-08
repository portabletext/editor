import {defineSchema} from '@portabletext/schema'
import {defineContainer} from '../src/renderers/renderer.types'

/**
 * A schema with two containers: a `callout` that can nest in itself, and a
 * `note` whose `body` declares its own text block sub-schema.
 */
export const textBlockDepthsSchemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'callout'}],
        },
      ],
    },
    {
      name: 'note',
      fields: [
        {
          name: 'body',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [{name: 'normal'}, {name: 'h1'}],
              decorators: [{name: 'em'}],
            },
          ],
        },
      ],
    },
  ],
})

export const textBlockDepthsContainers = [
  defineContainer({type: 'callout', arrayField: 'content'}),
  defineContainer({type: 'note', arrayField: 'body'}),
]
