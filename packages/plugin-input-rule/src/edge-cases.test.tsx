import {parameterTypes} from '@portabletext/editor/test'
import {
  createTestEditor,
  stepDefinitions,
  type Context,
} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import edgeCasesFeature from './edge-cases.feature?raw'
import {defineTextTransformRule} from './input-rule'
import {InputRulePlugin} from './plugin.input-rule'

const longerTransformRule = defineTextTransformRule({
  matcher: /\./,
  transform: () => '...',
})

const endStringRule = defineTextTransformRule({
  matcher: /->$/,
  transform: () => '→',
})

const nonGlobalRule = defineTextTransformRule({
  matcher: /\(c\)/,
  transform: () => '©',
})

const multipleGroupsRule = defineTextTransformRule({
  matcher: /(x)[fo]+(y)/,
  transform: () => 'z',
})

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        children: (
          <>
            <InputRulePlugin rules={[longerTransformRule]} />
            <InputRulePlugin rules={[endStringRule]} />
            <InputRulePlugin rules={[nonGlobalRule]} />
            <InputRulePlugin rules={[multipleGroupsRule]} />
          </>
        ),
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}],
          annotations: [{name: 'link'}],
        }),
      })

      context.locator = locator
      context.editor = editor
    }),
  ],
  featureText: edgeCasesFeature,
  stepDefinitions,
  parameterTypes,
})
