import {diffMatchPatch} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {Before, When} from 'racejar'
import {Feature} from 'racejar/vitest'
import applyFeature from '../gherkin-spec/apply.feature?raw'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {parameterTypes} from '../src/test'
import {
  createTestEditor,
  gherkinSchemaDefinition,
  stepDefinitions,
} from '../src/test/vitest'
import type {Context} from '../src/test/vitest/step-context'
import {getTextSelection} from '../test-utils/text-selection'

const schemaDefinition = defineSchema({
  ...gherkinSchemaDefinition,
  annotations: [
    {name: 'comment'},
    {name: 'link', fields: [{name: 'href', type: 'string'}]},
  ],
  blockObjects: [
    ...(gherkinSchemaDefinition.blockObjects ?? []),
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'image'}, {type: 'callout'}],
        },
      ],
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

const nodes = [
  defineContainer({type: 'callout', arrayField: 'content'}),
  defineContainer({type: 'table', arrayField: 'rows'}),
  defineContainer({type: 'row', arrayField: 'cells'}),
  defineContainer({type: 'cell', arrayField: 'content'}),
]

function findSpan(context: Context, text: string) {
  const selection = getTextSelection(context.editor.getSnapshot().context, text)
  const spanPath = selection.anchor.path

  return {spanPath, blockPath: spanPath.slice(0, -2)}
}

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        schemaDefinition,
        children: <NodePlugin nodes={nodes} />,
      })

      context.keyMap = new Map()
      context.locator = locator
      context.editor = editor
    }),
  ],
  featureText: applyFeature,
  stepDefinitions: [
    ...stepDefinitions,
    When(
      'a collaborator changes {string} to {string}',
      (context: Context, oldText: string, newText: string) => {
        const {spanPath} = findSpan(context, oldText)

        context.editor.send({
          type: 'apply',
          patches: [diffMatchPatch(oldText, newText, [...spanPath, 'text'])],
        })
      },
    ),
    When(
      "a collaborator's patch marked local changes {string} to {string}",
      (context: Context, oldText: string, newText: string) => {
        const {spanPath} = findSpan(context, oldText)

        context.editor.send({
          type: 'apply',
          patches: [
            {
              ...diffMatchPatch(oldText, newText, [...spanPath, 'text']),
              origin: 'local',
            },
          ],
        })
      },
    ),
  ],
  parameterTypes,
})
