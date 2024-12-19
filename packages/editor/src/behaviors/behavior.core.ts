import {coreBlockObjectBehaviors} from './behavior.core.block-objects'
import {coreDecoratorBehaviors} from './behavior.core.decorators'
import {coreListBehaviors} from './behavior.core.lists'
import {defineBehavior} from './behavior.types'

const softReturn = defineBehavior({
  on: 'insert.soft break',
  actions: [() => [{type: 'insert.text', text: '\n'}]],
})

/**
 * @beta
 */
export const coreBehaviors = [
  softReturn,
  coreDecoratorBehaviors.decoratorAdd,
  coreDecoratorBehaviors.decoratorRemove,
  coreDecoratorBehaviors.decoratorToggle,
  coreBlockObjectBehaviors.arrowDownOnLonelyBlockObject,
  coreBlockObjectBehaviors.arrowUpOnLonelyBlockObject,
  coreBlockObjectBehaviors.breakingBlockObject,
  coreBlockObjectBehaviors.deletingEmptyTextBlockAfterBlockObject,
  coreBlockObjectBehaviors.deletingEmptyTextBlockBeforeBlockObject,
  coreListBehaviors.clearListOnBackspace,
  coreListBehaviors.unindentListOnBackspace,
  coreListBehaviors.clearListOnEnter,
  coreListBehaviors.indentListOnTab,
  coreListBehaviors.unindentListOnShiftTab,
]

/**
 * @beta
 */
export const coreBehavior = {
  softReturn,
  decorators: coreDecoratorBehaviors,
  blockObjects: coreBlockObjectBehaviors,
  lists: coreListBehaviors,
}
