import {parameterTypes} from '@portabletext/editor/test'
import {
  createTestEditor,
  stepDefinitions,
  type Context,
} from '@portabletext/editor/test/vitest'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import emDashFeature from './em-dash.feature?raw'
import {
  emDashRule,
  TextTransformationPlugin,
} from './plugin.text-transformation'

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        children: <TextTransformationPlugin config={emDashRule} />,
      })

      context.locator = locator
      context.editor = editor
    }),
  ],
  featureText: emDashFeature,
  stepDefinitions,
  parameterTypes,
})
