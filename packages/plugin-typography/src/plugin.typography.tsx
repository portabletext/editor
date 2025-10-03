import {
  InputRulePlugin,
  type InputRuleGuard,
} from '@portabletext/plugin-input-rule'
import {useMemo} from 'react'
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

type TypographyPluginProps = {
  guard?: InputRuleGuard
}

const inputRules = [
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
]
/**
 * @beta
 */
export function TypographyPlugin(props: TypographyPluginProps) {
  const guardedInputRules = useMemo(
    () =>
      inputRules.map((rule) => ({...rule, guard: props.guard ?? (() => true)})),
    [props.guard],
  )

  return <InputRulePlugin {...props} rules={guardedInputRules} />
}
