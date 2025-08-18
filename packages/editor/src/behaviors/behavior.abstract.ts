import * as selectors from '../selectors'
import {abstractAnnotationBehaviors} from './behavior.abstract.annotation'
import {abstractDecoratorBehaviors} from './behavior.abstract.decorator'
import {abstractDeleteBehaviors} from './behavior.abstract.delete'
import {abstractDeserializeBehaviors} from './behavior.abstract.deserialize'
import {abstractInsertBehaviors} from './behavior.abstract.insert'
import {abstractKeyboardBehaviors} from './behavior.abstract.keyboard'
import {abstractListItemBehaviors} from './behavior.abstract.list-item'
import {abstractMoveBehaviors} from './behavior.abstract.move'
import {abstractSelectBehaviors} from './behavior.abstract.select'
import {abstractSerializeBehaviors} from './behavior.abstract.serialize'
import {abstractSplitBehaviors} from './behavior.abstract.split'
import {abstractStyleBehaviors} from './behavior.abstract.style'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractBehaviors = [
  defineBehavior({
    on: 'clipboard.copy',
    guard: ({snapshot}) => {
      const focusSpan = selectors.getFocusSpan(snapshot)
      const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)

      return focusSpan && selectionCollapsed
    },
    actions: [],
  }),
  defineBehavior({
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
    on: 'clipboard.cut',
    guard: ({snapshot}) => {
      const focusSpan = selectors.getFocusSpan(snapshot)
      const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)

      return focusSpan && selectionCollapsed
    },
    actions: [],
  }),
  defineBehavior({
    on: 'clipboard.cut',
    guard: ({snapshot}) => {
      return snapshot.context.selection
        ? {
            selection: snapshot.context.selection,
          }
        : false
    },
    actions: [
      ({event}, {selection}) => [
        raise({
          type: 'serialize',
          originEvent: event,
        }),
        raise({
          type: 'delete',
          at: selection,
        }),
      ],
    ],
  }),
  defineBehavior({
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
    on: 'clipboard.paste',
    guard: ({snapshot}) => {
      return snapshot.context.selection &&
        selectors.isSelectionExpanded(snapshot)
        ? {selection: snapshot.context.selection}
        : false
    },
    actions: [
      ({event}, {selection}) => [
        raise({
          type: 'delete',
          at: selection,
        }),
        raise({
          type: 'deserialize',
          originEvent: event,
        }),
      ],
    ],
  }),
  defineBehavior({
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
  defineBehavior({
    on: 'input.*',
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
  ...abstractInsertBehaviors,
  ...abstractKeyboardBehaviors,
  ...abstractListItemBehaviors,
  ...abstractMoveBehaviors,
  ...abstractStyleBehaviors,
  ...abstractSelectBehaviors,
  ...abstractSerializeBehaviors,
  ...abstractSplitBehaviors,
]
