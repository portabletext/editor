import {
  InputRulePlugin,
  type InputRule,
  type InputRuleGuard,
} from '@portabletext/plugin-input-rule'
import {useMemo} from 'react'
import {
  closingDoubleQuoteRule,
  closingSingleQuoteRule,
  copyrightRule,
  ellipsisRule,
  emDashRule,
  laquoRule,
  leftArrowRule,
  multiplicationRule,
  notEqualRule,
  oneHalfRule,
  oneQuarterRule,
  openingDoubleQuoteRule,
  openingSingleQuoteRule,
  plusMinusRule,
  raquoRule,
  registeredTrademarkRule,
  rightArrowRule,
  servicemarkRule,
  superscriptThreeRule,
  superscriptTwoRule,
  threeQuartersRule,
  trademarkRule,
} from './input-rules.typography'

/**
 * @public
 */
export type TypographyPluginProps = {
  guard?: InputRuleGuard
  /**
   * Configure which rules to enable or disable. Ordinary rules like `emDash` and `ellipsis` are enabled by default.
   * Less common rules like `multiplication` are disabled by default.
   */
  rules?: {
    /**
     * @defaultValue 'on'
     */
    emDash?: 'on' | 'off'
    /**
     * @defaultValue 'on'
     */
    ellipsis?: 'on' | 'off'
    /**
     * @defaultValue 'on'
     */
    openingDoubleQuote?: 'on' | 'off'
    /**
     * @defaultValue 'on'
     */
    closingDoubleQuote?: 'on' | 'off'
    /**
     * @defaultValue 'on'
     */
    openingSingleQuote?: 'on' | 'off'
    /**
     * @defaultValue 'on'
     */
    closingSingleQuote?: 'on' | 'off'
    /**
     * @defaultValue 'on'
     */
    leftArrow?: 'on' | 'off'
    /**
     * @defaultValue 'on'
     */
    rightArrow?: 'on' | 'off'
    /**
     * @defaultValue 'on'
     */
    copyright?: 'on' | 'off'
    /**
     * @defaultValue 'on'
     */
    trademark?: 'on' | 'off'
    /**
     * @defaultValue 'on'
     */
    servicemark?: 'on' | 'off'
    /**
     * @defaultValue 'on'
     */
    registeredTrademark?: 'on' | 'off'
    /**
     * @defaultValue 'off'
     */
    oneHalf?: 'on' | 'off'
    /**
     * @defaultValue 'off'
     */
    plusMinus?: 'on' | 'off'
    /**
     * @defaultValue 'off'
     */
    notEqual?: 'on' | 'off'
    /**
     * @defaultValue 'off'
     */
    laquo?: 'on' | 'off'
    /**
     * @defaultValue 'off'
     */
    raquo?: 'on' | 'off'
    /**
     * @defaultValue 'off'
     */
    multiplication?: 'on' | 'off'
    /**
     * @defaultValue 'off'
     */
    superscriptTwo?: 'on' | 'off'
    /**
     * @defaultValue 'off'
     */
    superscriptThree?: 'on' | 'off'
    /**
     * @defaultValue 'off'
     */
    oneQuarter?: 'on' | 'off'
    /**
     * @defaultValue 'off'
     */
    threeQuarters?: 'on' | 'off'
  }
}

type RuleName = keyof NonNullable<TypographyPluginProps['rules']>

const defaultRuleConfig: Array<{
  name: RuleName
  rule: InputRule
  state: 'on' | 'off'
}> = [
  {name: 'emDash', rule: emDashRule, state: 'on'},
  {name: 'ellipsis', rule: ellipsisRule, state: 'on'},
  {name: 'openingDoubleQuote', rule: openingDoubleQuoteRule, state: 'on'},
  {name: 'closingDoubleQuote', rule: closingDoubleQuoteRule, state: 'on'},
  {name: 'openingSingleQuote', rule: openingSingleQuoteRule, state: 'on'},
  {name: 'closingSingleQuote', rule: closingSingleQuoteRule, state: 'on'},
  {name: 'leftArrow', rule: leftArrowRule, state: 'on'},
  {name: 'rightArrow', rule: rightArrowRule, state: 'on'},
  {name: 'copyright', rule: copyrightRule, state: 'on'},
  {name: 'trademark', rule: trademarkRule, state: 'on'},
  {name: 'servicemark', rule: servicemarkRule, state: 'on'},
  {name: 'registeredTrademark', rule: registeredTrademarkRule, state: 'on'},
  {name: 'oneHalf', rule: oneHalfRule, state: 'off'},
  {name: 'plusMinus', rule: plusMinusRule, state: 'off'},
  {name: 'laquo', rule: laquoRule, state: 'off'},
  {name: 'notEqual', rule: notEqualRule, state: 'off'},
  {name: 'raquo', rule: raquoRule, state: 'off'},
  {name: 'multiplication', rule: multiplicationRule, state: 'off'},
  {name: 'superscriptTwo', rule: superscriptTwoRule, state: 'off'},
  {name: 'superscriptThree', rule: superscriptThreeRule, state: 'off'},
  {name: 'oneQuarter', rule: oneQuarterRule, state: 'off'},
  {name: 'threeQuarters', rule: threeQuartersRule, state: 'off'},
]

/**
 * @public
 */
export function TypographyPlugin(props: TypographyPluginProps) {
  const configuredInputRules = useMemo(
    () =>
      defaultRuleConfig.flatMap((rule) =>
        props.rules && props.rules[rule.name] === 'on'
          ? {...rule.rule, guard: props.guard ?? (() => true)}
          : (props.rules && props.rules[rule.name] === 'off') ||
              rule.state === 'off'
            ? []
            : {...rule.rule, guard: props.guard ?? (() => true)},
      ),
    [props.guard, props.rules],
  )

  return <InputRulePlugin {...props} rules={configuredInputRules} />
}
