import {corePriority} from '../priority/priority.core'
import {coreAnnotationBehaviors} from './behavior.core.annotations'
import {coreBlockObjectBehaviors} from './behavior.core.block-objects'
import {coreDecoratorBehaviors} from './behavior.core.decorators'
import {coreDndBehaviors} from './behavior.core.dnd'
import {coreInsertBreakBehaviors} from './behavior.core.insert-break'
import {coreListBehaviors} from './behavior.core.lists'

export const coreBehaviorsConfig = [
  coreAnnotationBehaviors.addAnnotationOnCollapsedSelection,
  coreDecoratorBehaviors.strongShortcut,
  coreDecoratorBehaviors.emShortcut,
  coreDecoratorBehaviors.underlineShortcut,
  coreDecoratorBehaviors.codeShortcut,
  ...coreDndBehaviors,
  coreBlockObjectBehaviors.clickingAboveLonelyBlockObject,
  coreBlockObjectBehaviors.clickingBelowLonelyBlockObject,
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
  coreInsertBreakBehaviors.breakingAtTheEndOfTextBlock,
  coreInsertBreakBehaviors.breakingAtTheStartOfTextBlock,
  coreInsertBreakBehaviors.breakingEntireDocument,
  coreInsertBreakBehaviors.breakingEntireBlocks,
].map((behavior) => ({
  behavior,
  priority: corePriority,
}))
