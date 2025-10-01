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

/**
 * @beta
 */
export function TypographyPlugin() {
  return (
    <InputRulePlugin
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
