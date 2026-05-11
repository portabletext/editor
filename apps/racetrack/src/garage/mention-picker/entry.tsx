/**
 * Garage entry: mention picker.
 *
 * Lifts the playground / runner wiring from the original
 * `mention-picker.test.tsx` in `@portabletext/plugin-typeahead-picker`
 * into a Racetrack-loadable entry. The `.feature` file is the same
 * file the customer's vitest suite runs.
 */

import {parameterTypes} from '@portabletext/editor/test'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import {expect, vi} from 'vitest'
import type {GarageEntry} from '../types'
// biome-ignore lint/correctness/noSelfImport: load own source for the engine viewer
import entrySource from './entry.tsx?raw'
import featureText from './feature.feature?raw'
import {MentionPickerPlugin, resetMatchesCallCount} from './Plugin'
import pluginSource from './Plugin.tsx?raw'
import {
  attachLocators,
  mentionPickerSteps,
  type MentionPickerContext,
} from './steps'
import stepsSource from './steps.ts?raw'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  annotations: [{name: 'link'}],
})

export const mentionPickerEntry: GarageEntry = {
  id: 'mention-picker',
  name: 'Mention Picker',
  description: 'Type @ to trigger a typeahead picker with async match lookup.',
  featureText,
  engine: [
    {name: 'Plugin.tsx', language: 'tsx', source: pluginSource},
    {name: 'entry.tsx', language: 'tsx', source: entrySource},
    {name: 'steps.ts', language: 'ts', source: stepsSource},
    {name: 'feature.feature', language: 'feature', source: featureText},
  ],
  PlaygroundComponent: MentionPickerPlugin,
  parameterTypes,
  buildStepDefinitions: ({editorStepDefinitions}) => [
    ...editorStepDefinitions,
    ...mentionPickerSteps,
  ],
  buildHooks: () => [
    Before(async (context: MentionPickerContext) => {
      resetMatchesCallCount()
      const {editor, locator} = await createTestEditor({
        children: <MentionPickerPlugin />,
        schemaDefinition,
      })
      context.editor = editor
      context.locator = locator
      attachLocators(context)
      await vi.waitFor(() =>
        expect.element(context.keywordLocator).toBeInTheDocument(),
      )
      await vi.waitFor(() =>
        expect.element(context.matchesLocator).toBeInTheDocument(),
      )
    }),
  ],
}
