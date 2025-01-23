import {coreAnnotationBehaviors} from './behavior.core.annotations'
import {coreBlockObjectBehaviors} from './behavior.core.block-objects'
import {coreDecoratorBehaviors} from './behavior.core.decorators'
import {coreDeserializeBehavior} from './behavior.core.deserialize'
import {coreInsertBreakBehaviors} from './behavior.core.insert-break'
import {coreListBehaviors} from './behavior.core.lists'
import {coreSerializeBehaviors} from './behavior.core.serialize'
import {coreStyleBehaviors} from './behavior.core.style'
import {defineBehavior, raise} from './behavior.types'

const softReturn = defineBehavior({
  on: 'insert.soft break',
  actions: [() => [raise({type: 'insert.text', text: '\n'})]],
})

/**
 * @beta
 */
export const coreBehaviors = [
  softReturn,
  coreAnnotationBehaviors.toggleAnnotationOff,
  coreAnnotationBehaviors.toggleAnnotationOn,
  coreDecoratorBehaviors.toggleDecoratorOff,
  coreDecoratorBehaviors.toggleDecoratorOn,
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
  coreInsertBreakBehaviors.atTheEndOfTextBlock,
  coreInsertBreakBehaviors.atTheStartOfTextBlock,
  coreSerializeBehaviors.serialize,
  coreSerializeBehaviors['serialization.success'],
  coreStyleBehaviors.toggleStyleOff,
  coreStyleBehaviors.toggleStyleOn,
]

/**
 * @beta
 */
export const coreBehavior = {
  softReturn,
  annotation: coreAnnotationBehaviors,
  decorators: coreDecoratorBehaviors,
  deserialize: coreDeserializeBehavior,
  blockObjects: coreBlockObjectBehaviors,
  insertBreak: coreInsertBreakBehaviors,
  lists: coreListBehaviors,
  ...coreSerializeBehaviors,
  style: coreSerializeBehaviors,
}
