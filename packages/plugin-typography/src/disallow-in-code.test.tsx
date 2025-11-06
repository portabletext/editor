import {parameterTypes} from '@portabletext/editor/test'
import {
  createTestEditor,
  stepDefinitions,
  type Context,
} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import {createDecoratorGuard} from './create-decorator-guard'
import disallowInCodeFeature from './disallow-in-code.feature?raw'
import {TypographyPlugin} from './plugin.typography'

const codeGuard = createDecoratorGuard({
  decorators: ({context}) =>
    context.schema.decorators.flatMap((decorator) =>
      decorator.name === 'code' ? [] : [decorator.name],
    ),
})

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        children: (
          <TypographyPlugin guard={codeGuard} enable={['multiplication']} />
        ),
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
