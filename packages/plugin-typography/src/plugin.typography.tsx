import {
  InputRulePlugin,
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

const defaultRuleConfig = [
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
] as const

type RuleName = (typeof defaultRuleConfig)[number]['name']

/**
 * @public
 */
export type TypographyPluginProps<
  TEnabledRuleName extends RuleName = never,
  TDisabledRuleName extends Exclude<RuleName, TEnabledRuleName> = never,
> = {
  guard?: InputRuleGuard
  /**
   * Preset configuration for rules.
   * - `'default'`: Common typography rules enabled (em dash, ellipsis, quotes, arrows, copyright symbols)
   * - `'all'`: All rules enabled
   * - `'none'`: No rules enabled (use with `enable` prop)
   *
   * @defaultValue 'default'
   */
  preset?: 'default' | 'all' | 'none'
  /**
   * Enable specific rules (additive to preset).
   * Use this to enable additional rules beyond the preset.
   *
   * @example
   * ```tsx
   * // Enable multiplication and plusMinus in addition to default rules
   * <TypographyPlugin enable={['multiplication', 'plusMinus']} />
   * ```
   */
  enable?: ReadonlyArray<TEnabledRuleName>
  /**
   * Disable specific rules (subtractive from preset).
   * Use this to disable rules that would otherwise be enabled by the preset.
   * Cannot contain rules that are in the `enable` array (TypeScript will enforce this).
   *
   * @example
   * ```tsx
   * // Disable em dash from the default rules
   * <TypographyPlugin disable={['emDash']} />
   * ```
   */
  disable?: ReadonlyArray<TDisabledRuleName>
}

/**
 * @public
 */
export function TypographyPlugin<
  TEnabledRuleName extends RuleName = never,
  TDisabledRuleName extends Exclude<RuleName, TEnabledRuleName> = never,
>(props: TypographyPluginProps<TEnabledRuleName, TDisabledRuleName>) {
  const {preset = 'default', enable = [], disable = [], guard} = props

  const configuredInputRules = useMemo(() => {
    // Determine which rules should be enabled based on preset
    const enabledRules = new Set<RuleName>()

    if (preset === 'all') {
      // Enable all rules
      for (const rule of defaultRuleConfig) {
        enabledRules.add(rule.name)
      }
    } else if (preset === 'default') {
      // Enable only default rules (state: 'on')
      for (const rule of defaultRuleConfig) {
        if (rule.state === 'on') {
          enabledRules.add(rule.name)
        }
      }
    }
    // preset === 'none' starts with empty set

    // Apply enable list (additive)
    for (const ruleName of enable) {
      enabledRules.add(ruleName)
    }

    // Apply disable list (subtractive)
    for (const ruleName of disable) {
      enabledRules.delete(ruleName)
    }

    // Build final rule list
    return defaultRuleConfig.flatMap((rule) =>
      enabledRules.has(rule.name)
        ? [{...rule.rule, guard: guard ?? (() => true)}]
        : [],
    )
  }, [preset, enable, disable, guard])

  return <InputRulePlugin rules={configuredInputRules} />
}
