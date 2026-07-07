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
  on: /(?<left>x)[fo]+(?<right>y)/,
  transform: {left: () => 'z', right: () => 'z'},
})

const replaceAandCRule = defineTextTransformRule({
  on: /(?<first>A).*(?<second>C)/,
  // Each target owns its transform, no identity plumbing needed
  transform: {first: () => 'C', second: () => 'A'},
})

const h1Rule = defineTextTransformRule({
  on: /^(?<marker># )/,
  transform: {marker: () => ''},
})

const betterH2Rule = defineTextTransformRule({
  on: /^(?<marker>## )/,
  guard: ({snapshot}) => {
    return !getPreviousInlineObject(snapshot)
  },
  transform: {marker: () => ''},
})

const unmatchedGroupsRule = defineTextTransformRule({
  on: /^(---)|^(—-)|^(___)|^(\*\*\*)/,
  transform: () => '<hr />',
})

const groupsWithoutReplaceRule = defineTextTransformRule({
  // A function transform replaces the WHOLE match, the capture group
  // grants nothing implicitly.
  on: /!(?<word>\w+)!/,
  transform: () => 'WHOLE',
})

const optionalReplaceGroupRule = defineTextTransformRule({
  // `replace` with an optional group: a match in which the group did not
  // participate has nothing to replace and is skipped.
  on: /judeee(?<tail> yeah)?/,
  transform: {tail: () => '!'},
})

const multiplicationRule = defineTextTransformRule({
  on: /\d+\s?(?<operator>[*x])\s?\d+/,
  transform: {operator: () => '×'},
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
            <InputRulePlugin rules={[groupsWithoutReplaceRule]} />
            <InputRulePlugin rules={[optionalReplaceGroupRule]} />
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
