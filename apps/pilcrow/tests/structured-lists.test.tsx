import {parameterTypes} from '@portabletext/editor/test'
import {stepDefinitions} from '@portabletext/editor/test/vitest'
import type {Context} from '@portabletext/editor/test/vitest'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import structuredListsFeature from './structured-lists.feature?raw'
import {createPilcrowTestEditor} from './test-editor'

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createPilcrowTestEditor()
      context.keyMap = new Map()
      context.locator = locator
      context.editor = editor
    }),
  ],
  featureText: structuredListsFeature,
  stepDefinitions,
  parameterTypes,
})
