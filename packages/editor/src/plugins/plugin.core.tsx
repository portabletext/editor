import {coreBehaviors} from '../behaviors/behavior.core'
import {BehaviorPlugin} from './plugin.behavior'

/**
 * @beta
 */
export function CoreBehaviorsPlugin() {
  return <BehaviorPlugin behaviors={coreBehaviors} />
}
