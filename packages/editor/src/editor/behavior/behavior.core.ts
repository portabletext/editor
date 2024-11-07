import {coreBlockObjectBehaviors} from './behavior.core.block-objects'
import {coreDecoratorBehaviors} from './behavior.core.decorators'
import {coreListBehaviors} from './behavior.core.lists'
import {defineBehavior} from './behavior.types'

const softReturn = defineBehavior({
  on: 'insert soft break',
  actions: [() => [{type: 'insert text', text: '\n'}]],
})

/**
 * @alpha
 */
export const coreBehaviors = [
  softReturn,
  coreDecoratorBehaviors.decoratorAdd,
  coreDecoratorBehaviors.decoratorRemove,
  coreDecoratorBehaviors.decoratorToggle,
  coreBlockObjectBehaviors.breakingBlockObject,
  coreBlockObjectBehaviors.deletingEmptyTextBlockAfterBlockObject,
  coreBlockObjectBehaviors.deletingEmptyTextBlockBeforeBlockObject,
  coreListBehaviors.clearListOnBackspace,
  coreListBehaviors.unindentListOnBackspace,
]

/**
 * @alpha
 */
export const coreBehavior = {
  softReturn,
  decorators: coreDecoratorBehaviors,
  blockObjects: coreBlockObjectBehaviors,
  lists: coreListBehaviors,
}
