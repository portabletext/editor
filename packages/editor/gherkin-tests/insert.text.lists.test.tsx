import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import insertTextFeature from '../gherkin-spec/insert.text.lists.feature?raw'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {parameterTypes} from '../src/test'
import {createTestEditor, stepDefinitions} from '../src/test/vitest'
import type {Context} from '../src/test/vitest/step-context'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  blockObjects: [
    {
      name: 'list',
      fields: [
        {name: 'kind', type: 'string'},
        {
          name: 'items',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'list-item',
              fields: [
                {
                  name: 'content',
                  type: 'array',
                  of: [{type: 'block'}, {type: 'list'}],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

const listContainer = defineContainer({
  type: 'list',
  arrayField: 'items',
  render: ({attributes, children}) => (
    <ul data-testid="list" {...attributes}>
      {children}
    </ul>
  ),
})

const listItemContainer = defineContainer({
  type: 'list-item',
  arrayField: 'content',
  render: ({attributes, children}) => (
    <li data-testid="list-item" {...attributes}>
      {children}
    </li>
  ),
})

const nodes = [listContainer, listItemContainer]

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        schemaDefinition,
        children: <NodePlugin nodes={nodes} />,
      })
      context.keyMap = new Map()
      context.editor = editor
      context.locator = locator
    }),
  ],

  featureText: insertTextFeature,
  stepDefinitions,
  parameterTypes,
})
