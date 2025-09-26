import {ellipsisRule} from './input-rule.ellipsis'
import {InputRulePlugin} from './plugin.input-rule'

/**
 * @beta
 */
export function EllipsisInputRulePlugin() {
  return <InputRulePlugin rules={[ellipsisRule]} />
}
