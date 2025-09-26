import {parameterTypes} from '@portabletext/editor/test'
import type {Context} from '@portabletext/editor/test/vitest'
import {
  createTestEditor,
  stepDefinitions,
} from '@portabletext/editor/test/vitest'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import {SmartQuotesPlugin} from './plugin.smart-quotes'
import smartQuotesFeature from './plugin.smart-quotes.feature?raw'

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        children: <SmartQuotesPlugin />,
      })

      context.locator = locator
      context.editor = editor
    }),
  ],
  featureText: smartQuotesFeature,
  stepDefinitions: stepDefinitions,
  parameterTypes,
})
