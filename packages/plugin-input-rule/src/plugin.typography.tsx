import type {BehaviorGuard} from '@portabletext/editor/behaviors'
import {
  copyrightRule,
  ellipsisRule,
  emDashRule,
  laquoRule,
  leftArrowRule,
  multiplicationRule,
  notEqualRule,
  oneHalfRule,
  oneQuarterRule,
  plusMinusRule,
  raquoRule,
  registeredTrademarkRule,
  rightArrowRule,
  servicemarkRule,
  smartQuotesRules,
  superscriptThreeRule,
  superscriptTwoRule,
  threeQuartersRule,
  trademarkRule,
} from './input-rules.typography'
import {InputRulePlugin} from './plugin.input-rule'

type TypographyPluginProps = {
  guard?: BehaviorGuard<{type: 'insert.text'; text: string}, boolean>
}

/**
 * @beta
 */
export function TypographyPlugin(props: TypographyPluginProps) {
  return (
    <InputRulePlugin
      {...props}
      rules={[
        emDashRule,
        ellipsisRule,
        ...smartQuotesRules,
        leftArrowRule,
        rightArrowRule,
        copyrightRule,
        trademarkRule,
        servicemarkRule,
        registeredTrademarkRule,
        oneHalfRule,
        plusMinusRule,
        notEqualRule,
        laquoRule,
        raquoRule,
        multiplicationRule,
        superscriptTwoRule,
        superscriptThreeRule,
        oneQuarterRule,
        threeQuartersRule,
      ]}
    />
  )
}
