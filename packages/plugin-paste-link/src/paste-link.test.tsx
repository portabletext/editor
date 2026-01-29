import {defineSchema} from '@portabletext/editor'
import {parameterTypes} from '@portabletext/editor/test'
import {
  createTestEditor,
  stepDefinitions,
  type Context,
} from '@portabletext/editor/test/vitest'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import pasteLinkFeature from './paste-link.feature?raw'
import {PasteLinkPlugin} from './plugin.paste-link'

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        children: <PasteLinkPlugin />,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
          annotations: [
            {name: 'link', fields: [{name: 'href', type: 'string'}]},
          ],
        }),
      })

      context.locator = locator
      context.editor = editor
    }),
  ],
  featureText: pasteLinkFeature,
  stepDefinitions,
  parameterTypes,
})
