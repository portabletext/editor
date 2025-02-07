import {coreAnnotationBehaviors} from './behavior.core.annotations'
import {coreBlockObjectBehaviors} from './behavior.core.block-objects'
import {coreDecoratorBehaviors} from './behavior.core.decorators'
import {coreDeserializeBehaviors} from './behavior.core.deserialize'
import {coreInsertBreakBehaviors} from './behavior.core.insert-break'
import {coreListBehaviors} from './behavior.core.lists'
import {coreSerializeBehaviors} from './behavior.core.serialize'
import {coreStyleBehaviors} from './behavior.core.style'

/**
 * @beta
 */
export const coreBehaviors = [
  coreAnnotationBehaviors.toggleAnnotationOff,
  coreAnnotationBehaviors.toggleAnnotationOn,
  coreAnnotationBehaviors.addAnnotationOnCollapsedSelection,
  coreDecoratorBehaviors.toggleDecoratorOff,
  coreDecoratorBehaviors.toggleDecoratorOn,
  coreDecoratorBehaviors.strongShortcut,
  coreDecoratorBehaviors.emShortcut,
  coreDecoratorBehaviors.underlineShortcut,
  coreDecoratorBehaviors.codeShortcut,
  coreDeserializeBehaviors.deserialize,
  coreDeserializeBehaviors['deserialization.success'],
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
