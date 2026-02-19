import {corePriority} from '../priority/priority.core'
import {createEditorPriority} from '../priority/priority.types'
import {coreAnnotationBehaviors} from './behavior.core.annotations'
import {coreBlockObjectBehaviors} from './behavior.core.block-objects'
import {coreDecoratorBehaviors} from './behavior.core.decorators'
import {coreDndBehaviors} from './behavior.core.dnd'
import {coreInsertBehaviors} from './behavior.core.insert'
import {coreInsertBreakBehaviors} from './behavior.core.insert-break'
import {coreListBehaviors} from './behavior.core.lists'

const coreBehaviors = [
  ...coreAnnotationBehaviors,
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
  ...coreInsertBehaviors,
  coreListBehaviors.clearListOnBackspace,
  coreListBehaviors.unindentListOnBackspace,
  coreListBehaviors.mergeTextIntoListOnDelete,
  coreListBehaviors.mergeTextIntoListOnBackspace,
  coreListBehaviors.deletingListFromStart,
  coreListBehaviors.clearListOnEnter,
  coreListBehaviors.indentListOnTab,
  coreListBehaviors.unindentListOnShiftTab,
  coreListBehaviors.inheritListLevel,
  coreListBehaviors.inheritListItem,
  coreListBehaviors.inheritListProperties,
  coreInsertBreakBehaviors.breakingAtTheEndOfTextBlock,
  coreInsertBreakBehaviors.breakingAtTheStartOfTextBlock,
  coreInsertBreakBehaviors.breakingEntireBlocks,
  coreInsertBreakBehaviors.breakingInlineObject,
]

// Each core behavior gets a unique priority chained to the previous one.
// This preserves their declaration order through re-sorts triggered by
// custom behavior registration/unregistration.
let previousPriority = corePriority
const coreBehaviorsConfigArray: Array<{
  behavior: (typeof coreBehaviors)[number]
  priority: ReturnType<typeof createEditorPriority>
}> = []

for (const behavior of coreBehaviors) {
  const priority = createEditorPriority({
    name: 'core',
    reference: {
      priority: previousPriority,
      importance: 'lower',
    },
  })
  coreBehaviorsConfigArray.push({behavior, priority})
  previousPriority = priority
}

export const coreBehaviorsConfig = coreBehaviorsConfigArray
