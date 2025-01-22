import {coreBlockObjectBehaviors} from './behavior.core.block-objects'
import {coreDecoratorBehaviors} from './behavior.core.decorators'
import {coreDeserializeBehavior} from './behavior.core.deserialize'
import {coreListBehaviors} from './behavior.core.lists'
import {coreSerializeBehaviors} from './behavior.core.serialize'
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
  coreDecoratorBehaviors.strongShortcut,
  coreDecoratorBehaviors.emShortcut,
  coreDecoratorBehaviors.underlineShortcut,
  coreDecoratorBehaviors.codeShortcut,
  coreDeserializeBehavior,
  coreBlockObjectBehaviors.arrowDownOnLonelyBlockObject,
  coreBlockObjectBehaviors.arrowUpOnLonelyBlockObject,
  coreBlockObjectBehaviors.breakingBlockObject,
  coreBlockObjectBehaviors.deletingEmptyTextBlockAfterBlockObject,
  coreBlockObjectBehaviors.deletingEmptyTextBlockBeforeBlockObject,
  coreListBehaviors.toggleListItemOff,
  coreListBehaviors.toggleListItemOn,
  coreListBehaviors.clearListOnBackspace,
  coreListBehaviors.unindentListOnBackspace,
  coreListBehaviors.clearListOnEnter,
  coreListBehaviors.indentListOnTab,
  coreListBehaviors.unindentListOnShiftTab,
  coreSerializeBehaviors.serialize,
  coreSerializeBehaviors['serialization.success'],
]

/**
 * @beta
 */
export const coreBehavior = {
  softReturn,
  decorators: coreDecoratorBehaviors,
  deserialize: coreDeserializeBehavior,
  blockObjects: coreBlockObjectBehaviors,
  lists: coreListBehaviors,
  ...coreSerializeBehaviors,
}
