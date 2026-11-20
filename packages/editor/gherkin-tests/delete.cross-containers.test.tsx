import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import feature from '../gherkin-spec/delete.cross-containers.feature?raw'
import {defineContainer} from '../src/renderers/renderer.types'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'
import type {Context} from '../src/test/vitest/step-context'

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'code-block',
      fields: [{name: 'lines', type: 'array', of: [{type: 'block'}]}],
    },
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'image'}],
        },
      ],
    },
    {name: 'image'},
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
                          of: [{type: 'block'}],
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
    type: 'code-block',
    arrayField: 'lines',
    render: ({attributes, children}) => <pre {...attributes}>{children}</pre>,
  }),
  defineContainer({
    type: 'callout',
    arrayField: 'content',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
  defineContainer({
    type: 'table',
    arrayField: 'rows',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
  defineContainer({
    type: 'row',
    arrayField: 'cells',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
  defineContainer({
    type: 'cell',
    arrayField: 'content',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
]

Feature({
  hooks: [
    Before((context: Context) => {
      context.editorConfig = {schemaDefinition, containers}
      context.keyMap = new Map()
    }),
  ],
  featureText: feature,
  stepDefinitions,
  parameterTypes,
})
