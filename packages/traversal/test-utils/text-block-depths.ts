// Keep in sync with `packages/editor/test-utils/text-block-depths.ts`.
import {defineSchema} from '@portabletext/schema'
import type {ContainerDeclaration} from '../src/compile-containers'

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

export const textBlockDepthsContainers: ReadonlyArray<ContainerDeclaration> = [
  {kind: 'container', type: 'callout', arrayField: 'content'},
  {kind: 'container', type: 'note', arrayField: 'body'},
]
