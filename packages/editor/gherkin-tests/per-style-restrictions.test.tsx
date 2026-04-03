import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import perStyleRestrictionsFeature from '../gherkin-spec/per-style-restrictions.feature?raw'
import {parameterTypes} from '../src/test'
import {createTestEditor, stepDefinitions} from '../src/test/vitest'
import type {Context} from '../src/test/vitest/step-context'

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
          annotations: [{name: 'link'}],
          styles: [
            {name: 'normal'},
            {name: 'h1', decorators: [], annotations: []},
            {name: 'h2', decorators: [{name: 'em'}]},
            {name: 'blockquote'},
          ],
          lists: [{name: 'bullet'}],
        }),
      })

      context.keyMap = new Map()
      context.locator = locator
      context.editor = editor
    }),
  ],
  featureText: perStyleRestrictionsFeature,
  stepDefinitions,
  parameterTypes,
})
