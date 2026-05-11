/**
 * Garage entry: input-rule edge cases.
 *
 * Nine text-transform rules sharing one editor. Lifted from
 * `packages/plugin-input-rule/src/edge-cases.test.tsx`. Uses only the
 * default editor step definitions; the entire `.feature` is declarative
 * `Given/When/Then` against editor state.
 */

import {parameterTypes} from '@portabletext/editor/test'
import {createTestEditor, type Context} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import type {GarageEntry} from '../types'
import entrySource from './entry.tsx?raw'
import featureText from './feature.feature?raw'
import {InputRuleEdgeCasesPlugin} from './Plugin'
import pluginSource from './Plugin.tsx?raw'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  annotations: [{name: 'link'}],
  inlineObjects: [{name: 'stock-ticker'}],
})

export const inputRuleEdgeCasesEntry: GarageEntry = {
  id: 'input-rule-edge-cases',
  name: 'Input rule: edge cases',
  description: 'Nine text-transform rules running side by side.',
  featureText,
  engine: [
    {name: 'Plugin.tsx', language: 'tsx', source: pluginSource},
    {name: 'entry.tsx', language: 'tsx', source: entrySource},
    {name: 'feature.feature', language: 'feature', source: featureText},
  ],
  PlaygroundComponent: InputRuleEdgeCasesPlugin,
  parameterTypes,
  buildStepDefinitions: ({editorStepDefinitions}) => editorStepDefinitions,
  buildHooks: () => [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        children: <InputRuleEdgeCasesPlugin />,
        schemaDefinition,
      })
      context.editor = editor
      context.locator = locator
    }),
  ],
}
