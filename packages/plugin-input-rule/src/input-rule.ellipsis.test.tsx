import {parameterTypes} from '@portabletext/editor/test'
import {
  createTestEditor,
  stepDefinitions,
  type Context,
} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import {ellipsisRule} from './input-rule.ellipsis'
import ellipsisFeature from './input-rule.ellipsis.feature?raw'
import {InputRulePlugin} from './plugin.input-rule'

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        children: <InputRulePlugin rules={[ellipsisRule]} />,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}],
          annotations: [{name: 'link'}],
        }),
      })

      context.locator = locator
      context.editor = editor
    }),
  ],
  featureText: ellipsisFeature,
  stepDefinitions,
  parameterTypes,
})
