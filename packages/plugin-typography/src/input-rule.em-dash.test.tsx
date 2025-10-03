import {parameterTypes} from '@portabletext/editor/test'
import {
  createTestEditor,
  stepDefinitions,
  type Context,
} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import emDashFeature from './input-rule.em-dash.feature?raw'
import {TypographyPlugin} from './plugin.typography'

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        children: <TypographyPlugin />,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}],
          annotations: [{name: 'link'}],
        }),
      })

      context.locator = locator
      context.editor = editor
    }),
  ],
  featureText: emDashFeature,
  stepDefinitions,
  parameterTypes,
})
