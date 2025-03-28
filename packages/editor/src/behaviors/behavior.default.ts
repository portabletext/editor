import {isTextBlock} from '../internal-utils/parse-blocks'
import * as selectors from '../selectors'
import {getTextBlockText} from '../utils'
import {abstractAnnotationBehaviors} from './behavior.abstract.annotation'
import {abstractDecoratorBehaviors} from './behavior.abstract.decorator'
import {abstractInsertBehaviors} from './behavior.abstract.insert'
import {abstractListItemBehaviors} from './behavior.abstract.list-item'
import {abstractMoveBehaviors} from './behavior.abstract.move'
import {abstractSelectBehaviors} from './behavior.abstract.select'
import {abstractStyleBehaviors} from './behavior.abstract.style'
import {raiseInsertSoftBreak} from './behavior.default.raise-soft-break'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

const raiseDeserializationSuccessOrFailure = defineBehavior({
  on: 'deserialize',
  guard: ({snapshot, event}) => {
    const deserializeEvents = snapshot.context.converters.flatMap(
      (converter) => {
        const data = event.originEvent.originEvent.dataTransfer.getData(
          converter.mimeType,
        )

        if (!data) {
          return []
        }

        return [
          converter.deserialize({
            snapshot,
            event: {type: 'deserialize', data},
          }),
        ]
      },
    )

    const firstSuccess = deserializeEvents.find(
      (deserializeEvent) => deserializeEvent.type === 'deserialization.success',
    )

    if (!firstSuccess) {
      return {
        type: 'deserialization.failure',
        mimeType: '*/*',
        reason: deserializeEvents
          .map((deserializeEvent) =>
            deserializeEvent.type === 'deserialization.failure'
              ? deserializeEvent.reason
              : '',
          )
          .join(', '),
      } as const
    }

    return firstSuccess
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

export const defaultBehaviors = [
  defineBehavior({
    on: 'clipboard.copy',
    guard: ({snapshot}) => {
      const focusSpan = selectors.getFocusSpan(snapshot)
      const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)

      return focusSpan && selectionCollapsed
    },
    actions: [() => [{type: 'noop'}]],
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
    actions: [() => [{type: 'noop'}]],
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
          selection,
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
  defineBehavior({
    on: 'drag.drop',
    guard: ({snapshot, event}) => {
      const dragOrigin = snapshot.beta.internalDrag?.origin
      const dropPosition = event.position.selection
      const droppingOnDragOrigin = dragOrigin
        ? selectors.isOverlappingSelection(dropPosition)({
            ...snapshot,
            context: {
              ...snapshot.context,
              selection: dragOrigin.selection,
            },
          })
        : false
      return droppingOnDragOrigin
    },
    actions: [() => [{type: 'noop'}]],
  }),
  defineBehavior({
    on: 'drag.drop',
    actions: [
      ({event}) => [
        raise({
          type: 'select',
          selection: event.position.selection,
        }),
        raise({
          type: 'deserialize',
          originEvent: event,
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'deserialization.success',
    guard: ({snapshot, event}) => {
      if (
        event.originEvent.type !== 'drag.drop' ||
        snapshot.beta.internalDrag === undefined
      ) {
        return false
      }

      const dragOrigin = snapshot.beta.internalDrag.origin
      const dropPosition = event.originEvent.position.selection
      const droppingOnDragOrigin = dragOrigin
        ? selectors.isOverlappingSelection(dropPosition)({
            ...snapshot,
            context: {
              ...snapshot.context,
              selection: dragOrigin.selection,
            },
          })
        : false

      const draggingEntireBlocks = selectors.isSelectingEntireBlocks({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: dragOrigin.selection,
        },
      })

      const draggedBlocks = selectors.getSelectedBlocks({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: dragOrigin.selection,
        },
      })

      if (!droppingOnDragOrigin) {
        return {
          draggingEntireBlocks,
          draggedBlocks,
          dragOrigin,
          originEvent: event.originEvent,
        }
      }

      return false
    },
    actions: [
      (
        {event},
        {draggingEntireBlocks, draggedBlocks, dragOrigin, originEvent},
      ) => [
        ...(draggingEntireBlocks
          ? draggedBlocks.map((block) =>
              raise({
                type: 'delete.block',
                at: block.path,
              }),
            )
          : [
              raise({
                type: 'delete',
                selection: dragOrigin.selection,
              }),
            ]),
        raise({
          type: 'insert.blocks',
          blocks: event.data,
          placement: draggingEntireBlocks
            ? originEvent.position.block === 'start'
              ? 'before'
              : originEvent.position.block === 'end'
                ? 'after'
                : 'auto'
            : 'auto',
        }),
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
        const activeDecorators = snapshot.context.activeDecorators
        const activeAnnotations = selectors.getActiveAnnotations(snapshot)

        return {
          activeAnnotations,
          activeDecorators,
          textRuns: event.data.flatMap((block) =>
            isTextBlock(snapshot.context.schema, block)
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
          selection,
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
  ...abstractInsertBehaviors,
  ...abstractListItemBehaviors,
  ...abstractMoveBehaviors,
  ...abstractStyleBehaviors,
  ...abstractSelectBehaviors,
  raiseDeserializationSuccessOrFailure,
  raiseSerializationSuccessOrFailure,
  raiseInsertSoftBreak,
]
