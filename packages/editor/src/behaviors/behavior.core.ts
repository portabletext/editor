import {isBlockObject} from '../internal-utils/parse-blocks'
import {coreAnnotationBehaviors} from './behavior.core.annotations'
import {coreBlockObjectBehaviors} from './behavior.core.block-objects'
import {coreDecoratorBehaviors} from './behavior.core.decorators'
import {coreDndBehaviors} from './behavior.core.dnd'
import {coreInsertBreakBehaviors} from './behavior.core.insert-break'
import {coreListBehaviors} from './behavior.core.lists'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'
import {defineSerializeBehavior} from './behavior.types.converter'

/**
 * @beta
 */
export const coreBehaviors = [
  defineBehavior({
    on: 'serialize.block.image',
    guard: ({snapshot, event}) => {
      if (isBlockObject(snapshot.context.schema, event.block)) {
        const url = event.block['url']

        if (typeof url === 'string') {
          return {url}
        }
      }

      return false
    },
    actions: [
      ({event}, {url}) => [
        raise({
          type: 'serialization.success',
          data: `<img src="${url}">`,
          mimeType: 'text/html',
          originEvent: event.originEvent,
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'serialize.block.image',
    actions: [
      ({event}) => [
        raise({
          type: 'serialization.success',
          data: `[${event.block._type}]`,
          mimeType: 'text/html',
          originEvent: event.originEvent,
        }),
      ],
    ],
  }),
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
]
