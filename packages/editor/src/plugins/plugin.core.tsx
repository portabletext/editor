import {coreBehaviors} from '../behaviors'
import {BehaviorPlugin} from './plugin.behavior'

/**
 * @beta
 */
export function CoreBehaviorsPlugin() {
  return <BehaviorPlugin behaviors={coreBehaviors} />
}
