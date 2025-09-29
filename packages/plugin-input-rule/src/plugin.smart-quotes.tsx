import {smartQuotesRules} from './input-rule.smart-quotes'
import {InputRulePlugin} from './plugin.input-rule'

/**
 * @beta
 */
export function SmartQuotesInputRulePlugin() {
  return <InputRulePlugin rules={smartQuotesRules} />
}
