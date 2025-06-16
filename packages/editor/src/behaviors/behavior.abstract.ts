import type {ConverterEvent} from '../converters/converter.types'
import {isTextBlock} from '../internal-utils/parse-blocks'
import * as selectors from '../selectors'
import {getActiveDecorators} from '../selectors/selector.get-active-decorators'
import type {PickFromUnion} from '../type-utils'
import {getTextBlockText} from '../utils'
import {abstractAnnotationBehaviors} from './behavior.abstract.annotation'
import {abstractDecoratorBehaviors} from './behavior.abstract.decorator'
import {abstractDeleteBehaviors} from './behavior.abstract.delete'
import {abstractInsertBehaviors} from './behavior.abstract.insert'
import {abstractKeyboardBehaviors} from './behavior.abstract.keyboard'
import {abstractListItemBehaviors} from './behavior.abstract.list-item'
import {abstractMoveBehaviors} from './behavior.abstract.move'
import {abstractSelectBehaviors} from './behavior.abstract.select'
import {abstractSplitBehaviors} from './behavior.abstract.split'
import {abstractStyleBehaviors} from './behavior.abstract.style'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

const raiseDeserializationSuccessOrFailure = defineBehavior({
  on: 'deserialize',
  guard: ({snapshot, event}) => {
    let success:
      | PickFromUnion<ConverterEvent, 'type', 'deserialization.success'>
      | undefined
    const failures: Array<
      PickFromUnion<ConverterEvent, 'type', 'deserialization.failure'>
    > = []

    for (const converter of snapshot.context.converters) {
      const data = event.originEvent.originEvent.dataTransfer.getData(
        converter.mimeType,
      )

      if (!data) {
        continue
      }

      const deserializeEvent = converter.deserialize({
        snapshot,
        event: {type: 'deserialize', data},
      })

      if (deserializeEvent.type === 'deserialization.success') {
        success = deserializeEvent
        break
      } else {
        failures.push(deserializeEvent)
      }
    }

    if (!success) {
      return {
        type: 'deserialization.failure',
        mimeType: '*/*',
        reason: failures.map((failure) => failure.reason).join(', '),
      } as const
    }

    return success
  },
  actions: [
    ({event}, deserializeEvent) => [
      raise({
        ...deserializeEvent,
        originEvent: event.originEvent,
      }),
    ],
  ],
})

const raiseSerializationSuccessOrFailure = defineBehavior({
  on: 'serialize',
  guard: ({snapshot, event}) => {
    if (snapshot.context.converters.length === 0) {
      return false
    }

    const serializeEvents = snapshot.context.converters.map((converter) =>
      converter.serialize({
        snapshot,
        event: {
          ...event,
          originEvent: event.originEvent.type,
        },
      }),
    )

    if (serializeEvents.length === 0) {
      return false
    }

    return serializeEvents
  },
  actions: [
    ({event}, serializeEvents) =>
      serializeEvents.map((serializeEvent) => {
        return raise({
          ...serializeEvent,
          originEvent: event.originEvent,
        })
      }),
  ],
})

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
    on: 'serialization.success',
    actions: [
      ({event}) => [
        {
          type: 'effect',
          effect: () => {
            event.originEvent.originEvent.dataTransfer.setData(
              event.mimeType,
              event.data,
            )
          },
        },
      ],
    ],
  }),
  defineBehavior({
    on: 'serialization.failure',
    actions: [
      ({event}) => [
        {
          type: 'effect',
          effect: () => {
            console.warn(
              `Serialization of ${event.mimeType} failed with reason "${event.reason}"`,
            )
          },
        },
      ],
    ],
  }),

  /**
   * If we are pasting text/plain into a text block then we can probably
   * assume that the intended behavior is that the pasted text inherits
   * formatting from the text it's pasted into.
   */
  defineBehavior({
    on: 'deserialization.success',
    guard: ({snapshot, event}) => {
      const focusTextBlock = selectors.getFocusTextBlock(snapshot)

      if (
        focusTextBlock &&
        event.mimeType === 'text/plain' &&
        event.originEvent.type === 'clipboard.paste'
      ) {
        const activeDecorators = getActiveDecorators(snapshot)
        const activeAnnotations = selectors.getActiveAnnotations(snapshot)

        return {
          activeAnnotations,
          activeDecorators,
          textRuns: event.data.flatMap((block) =>
            isTextBlock(snapshot.context, block)
              ? [getTextBlockText(block)]
              : [],
          ),
        }
      }

      return false
    },
    actions: [
      (_, {activeAnnotations, activeDecorators, textRuns}) =>
        textRuns.flatMap((textRun, index) =>
          index !== textRuns.length - 1
            ? [
                raise({
                  type: 'insert.span',
                  text: textRun,
                  decorators: activeDecorators,
                  annotations: activeAnnotations.map(
                    ({_key, _type, ...value}) => ({
                      name: _type,
                      value,
                    }),
                  ),
                }),
                raise({type: 'insert.break'}),
              ]
            : [
                raise({
                  type: 'insert.span',
                  text: textRun,
                  decorators: activeDecorators,
                  annotations: activeAnnotations.map(
                    ({_key, _type, ...value}) => ({
                      name: _type,
                      value,
                    }),
                  ),
                }),
              ],
        ),
    ],
  }),
  defineBehavior({
    on: 'deserialization.success',
    actions: [
      ({event}) => [
        raise({
          type: 'insert.blocks',
          blocks: event.data,
          placement: 'auto',
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'deserialization.failure',
    actions: [
      ({event}) => [
        {
          type: 'effect',
          effect: () => {
            console.warn(
              `Deserialization of ${event.mimeType} failed with reason "${event.reason}"`,
            )
          },
        },
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
  ...abstractInsertBehaviors,
  ...abstractKeyboardBehaviors,
  ...abstractListItemBehaviors,
  ...abstractMoveBehaviors,
  ...abstractStyleBehaviors,
  ...abstractSelectBehaviors,
  ...abstractSplitBehaviors,
  raiseDeserializationSuccessOrFailure,
  raiseSerializationSuccessOrFailure,
]
