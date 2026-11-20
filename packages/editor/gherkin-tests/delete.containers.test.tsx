import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import feature from '../gherkin-spec/delete.containers.feature?raw'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {parameterTypes} from '../src/test'
import {createTestEditor, stepDefinitions} from '../src/test/vitest'
import type {Context} from '../src/test/vitest/step-context'

const schemaDefinition = defineSchema({
  blockObjects: [
    {name: 'image'},
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
    {
      name: 'table',
      fields: [
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'row',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'object',
                      name: 'cell',
                      fields: [
                        {
                          name: 'content',
                          type: 'array',
                          of: [{type: 'block'}, {type: 'image'}],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

const containers = [
  defineContainer({
    type: 'callout',
    arrayField: 'content',
  }),
  defineContainer({
    type: 'table',
    arrayField: 'rows',
  }),
  defineContainer({
    type: 'row',
    arrayField: 'cells',
  }),
  defineContainer({
    type: 'cell',
    arrayField: 'content',
  }),
]

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        schemaDefinition,
        children: <NodePlugin nodes={containers} />,
      })
      context.editor = editor
      context.locator = locator
      context.keyMap = new Map()
    }),
  ],
  featureText: feature,
  stepDefinitions,
  parameterTypes,
})
