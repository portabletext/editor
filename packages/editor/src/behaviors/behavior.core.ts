import {defaultKeyGenerator} from '../editor/key-generator'
import {isHotkey} from '../internal-utils/is-hotkey'
import {getPreviousBlock} from '../selectors'
import {coreAnnotationBehaviors} from './behavior.core.annotations'
import {coreBlockObjectBehaviors} from './behavior.core.block-objects'
import {coreDecoratorBehaviors} from './behavior.core.decorators'
import {coreDndBehaviors} from './behavior.core.dnd'
import {coreInsertBreakBehaviors} from './behavior.core.insert-break'
import {coreListBehaviors} from './behavior.core.lists'
import {effect, raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

let index = 0

/**
 * @beta
 */
export const coreBehaviors = [
  defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) => {
      //   getPreviousBlock(snapshot)
      //   getPreviousBlock(snapshot)
      //   getPreviousBlock(snapshot)
      //   getPreviousBlock(snapshot)
      //   getPreviousBlock(snapshot)
      //   getPreviousBlock(snapshot)
      //   getPreviousBlock(snapshot)
      //   getPreviousBlock(snapshot)
      //   getPreviousBlock(snapshot)
      //   getPreviousBlock(snapshot)
      //   getPreviousBlock(snapshot)

      if (isHotkey('ArrowDown', event.originEvent)) {
        return {_key: defaultKeyGenerator()}
      }

      return false
    },
    actions: [
      (_, {_key}) => [
        raise({
          type: 'insert.block',
          placement: 'after',
          select: 'end',
          block: {
            _key,
            _type: 'block',
            children: [{_type: 'span', text: `${index}: ${_key}`}],
          },
        }),
        effect(() => {
          index++
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) => {
      if (isHotkey('ArrowUp', event.originEvent)) {
        return {_key: defaultKeyGenerator()}
      }

      return false
    },
    actions: [
      (_, {_key}) => [
        raise({
          type: 'insert.block',
          placement: 'before',
          select: 'start',
          block: {
            _key,
            _type: 'block',
            children: [{_type: 'span', text: `${index}: ${_key}`}],
          },
        }),
        effect(() => {
          index++
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
