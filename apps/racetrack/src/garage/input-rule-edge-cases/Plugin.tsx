/**
 * Plugin host for the input-rule edge-cases garage entry.
 *
 * Lifts the rule wiring from
 * `packages/plugin-input-rule/src/edge-cases.test.tsx` so the same
 * `.feature` file runs unchanged in Racetrack.
 */

import {getPreviousInlineObject} from '@portabletext/editor/selectors'
import {
  defineTextTransformRule,
  InputRulePlugin,
} from '@portabletext/plugin-input-rule'

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
  transform: ({location}: {location: {text: string}}) => {
    return location.text === 'A' ? 'C' : 'A'
  },
})

const h1Rule = defineTextTransformRule({
  on: /^(# )/,
  transform: () => '',
})

const betterH2Rule = defineTextTransformRule({
  on: /^(## )/,
  guard: ({
    snapshot,
  }: {
    snapshot: Parameters<typeof getPreviousInlineObject>[0]
  }) => {
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

export function InputRuleEdgeCasesPlugin() {
  return (
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
  )
}
