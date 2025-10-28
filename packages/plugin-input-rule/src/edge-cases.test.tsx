import {getPreviousInlineObject} from '@portabletext/editor/selectors'
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
import {InputRulePlugin} from './plugin.input-rule'
import {defineTextTransformRule} from './text-transform-rule'

const longerTransformRule = defineTextTransformRule({
  on: /\./,
  transform: () => '...',
})

const endStringRule = defineTextTransformRule({
  on: /->$/,
  transform: () => '→',
})

const nonGlobalRule = defineTextTransformRule({
  on: /\(c\)/,
  transform: () => '©',
})

const multipleGroupsRule = defineTextTransformRule({
  on: /(x)[fo]+(y)/,
  transform: () => 'z',
})

const replaceAandCRule = defineTextTransformRule({
  on: /(A).*(C)/,
  transform: ({location}) => {
    return location.text === 'A' ? 'C' : 'A'
  },
})

const h1Rule = defineTextTransformRule({
  on: /^(# )/,
  transform: () => '',
})

const betterH2Rule = defineTextTransformRule({
  on: /^(## )/,
  guard: ({snapshot}) => {
    return !getPreviousInlineObject(snapshot)
  },
  transform: () => '',
})

const unmatchedGroupsRule = defineTextTransformRule({
  on: /^(---)|^(—-)|^(___)|^(\*\*\*)/,
  transform: () => '<hr />',
})

const multiplicationRule = defineTextTransformRule({
  on: /\d+\s?([*x])\s?\d+/,
  transform: () => '×',
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
            <InputRulePlugin rules={[h1Rule]} />
            <InputRulePlugin rules={[betterH2Rule]} />
            <InputRulePlugin rules={[replaceAandCRule]} />
            <InputRulePlugin rules={[unmatchedGroupsRule]} />
            <InputRulePlugin rules={[multiplicationRule]} />
          </>
        ),
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}],
          annotations: [{name: 'link'}],
          inlineObjects: [{name: 'stock-ticker'}],
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
