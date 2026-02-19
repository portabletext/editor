import {getFocusSpan} from '../selectors/selector.get-focus-span'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import {isSelectionExpanded} from '../selectors/selector.is-selection-expanded'
import {abstractAnnotationBehaviors} from './behavior.abstract.annotation'
import {abstractDecoratorBehaviors} from './behavior.abstract.decorator'
import {abstractDeleteBehaviors} from './behavior.abstract.delete'
import {abstractDeserializeBehaviors} from './behavior.abstract.deserialize'
import {abstractInputBehaviors} from './behavior.abstract.input'
import {abstractInsertBehaviors} from './behavior.abstract.insert'
import {abstractKeyboardBehaviors} from './behavior.abstract.keyboard'
import {abstractListItemBehaviors} from './behavior.abstract.list-item'
import {abstractMoveBehaviors} from './behavior.abstract.move'
import {abstractSelectBehaviors} from './behavior.abstract.select'
import {abstractSerializeBehaviors} from './behavior.abstract.serialize'
import {abstractSplitBehaviors} from './behavior.abstract.split'
import {abstractStyleBehaviors} from './behavior.abstract.style'
import {forward, raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractBehaviors = [
  defineBehavior({
    name: 'copyOnCollapsedSelection',
    on: 'clipboard.copy',
    guard: ({snapshot}) => {
      const focusSpan = getFocusSpan(snapshot)
      const selectionCollapsed = isSelectionCollapsed(snapshot)

      return focusSpan && selectionCollapsed
    },
    actions: [],
  }),
  defineBehavior({
    name: 'copySerialize',
    on: 'clipboard.copy',
    actions: [
      ({event}) => [
        raise({
          type: 'serialize',
          originEvent: event,
        }),
      ],
    ],
  }),
  defineBehavior({
    name: 'cutOnCollapsedSelection',
    on: 'clipboard.cut',
    guard: ({snapshot}) => {
      const focusSpan = getFocusSpan(snapshot)
      const selectionCollapsed = isSelectionCollapsed(snapshot)

      return focusSpan && selectionCollapsed
    },
    actions: [],
  }),
  defineBehavior({
    name: 'cutSerializeAndDelete',
    on: 'clipboard.cut',
    guard: ({snapshot}) => snapshot.context.selection,
    actions: [
      ({event}) => [
        raise({
          type: 'serialize',
          originEvent: event,
        }),
        raise({
          type: 'delete',
        }),
      ],
    ],
  }),
  defineBehavior({
    name: 'dragStartSerialize',
    on: 'drag.dragstart',
    actions: [
      ({event}) => [
        raise({
          type: 'serialize',
          originEvent: event,
        }),
      ],
    ],
  }),

  defineBehavior({
    name: 'pasteDeleteExpandedSelection',
    on: 'clipboard.paste',
    guard: ({snapshot}) => isSelectionExpanded(snapshot),
    actions: [
      ({event}) => [
        raise({
          type: 'delete',
        }),
        forward(event),
      ],
    ],
  }),
  defineBehavior({
    name: 'pasteDeserialize',
    on: 'clipboard.paste',
    actions: [
      ({event}) => [
        raise({
          type: 'deserialize',
          originEvent: event,
        }),
      ],
    ],
  }),
  ...abstractAnnotationBehaviors,
  ...abstractDecoratorBehaviors,
  ...abstractDeleteBehaviors,
  ...abstractDeserializeBehaviors,
  ...abstractInputBehaviors,
  ...abstractInsertBehaviors,
  ...abstractKeyboardBehaviors,
  ...abstractListItemBehaviors,
  ...abstractMoveBehaviors,
  ...abstractStyleBehaviors,
  ...abstractSelectBehaviors,
  ...abstractSerializeBehaviors,
  ...abstractSplitBehaviors,
]
