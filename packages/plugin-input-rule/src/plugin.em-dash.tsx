import {emDashRule} from './input-rule.em-dash'
import {InputRulePlugin} from './plugin.input-rule'

/**
 * @beta
 */
export function EmDashInputRulePlugin() {
  return <InputRulePlugin rules={[emDashRule]} />
}
