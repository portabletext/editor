import {isActiveDecorator} from '@portabletext/editor/selectors'
import {parameterTypes} from '@portabletext/editor/test'
import {
  createTestEditor,
  stepDefinitions,
  type Context,
} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import disallowInCodeFeature from './disallow-in-code.feature?raw'
import type {InputRuleGuard} from './plugin.input-rule'
import {TypographyPlugin} from './plugin.typography'

const guard: InputRuleGuard = ({snapshot}) => {
  const codeIsActive = isActiveDecorator('code')(snapshot)

  return !codeIsActive
}

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        children: <TypographyPlugin guard={guard} />,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'code'}],
          annotations: [{name: 'link'}],
        }),
      })

      context.locator = locator
      context.editor = editor
    }),
  ],
  featureText: disallowInCodeFeature,
  stepDefinitions,
  parameterTypes,
})
