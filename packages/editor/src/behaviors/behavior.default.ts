import * as selectors from '../selectors'
import {raiseInsertSoftBreak} from './behavior.default.raise-soft-break'
import {defineBehavior, raise, type InsertPlacement} from './behavior.types'

const toggleAnnotationOff = defineBehavior({
  on: 'annotation.toggle',
  guard: ({snapshot, event}) =>
    selectors.isActiveAnnotation(event.annotation.name)(snapshot),
  actions: [
    ({event}) => [
      raise({type: 'annotation.remove', annotation: event.annotation}),
    ],
  ],
})

const toggleAnnotationOn = defineBehavior({
  on: 'annotation.toggle',
  guard: ({snapshot, event}) =>
    !selectors.isActiveAnnotation(event.annotation.name)(snapshot),
  actions: [
    ({event}) => [
      raise({type: 'annotation.add', annotation: event.annotation}),
    ],
  ],
})

const toggleDecoratorOff = defineBehavior({
  on: 'decorator.toggle',
  guard: ({snapshot, event}) =>
    selectors.isActiveDecorator(event.decorator)(snapshot),
  actions: [
    ({event}) => [
      raise({type: 'decorator.remove', decorator: event.decorator}),
    ],
  ],
})

const toggleDecoratorOn = defineBehavior({
  on: 'decorator.toggle',
  guard: ({snapshot, event}) =>
    !selectors.isActiveDecorator(event.decorator)(snapshot),
  actions: [
    ({event}) => [raise({type: 'decorator.add', decorator: event.decorator})],
  ],
})

const toggleListItemOff = defineBehavior({
  on: 'list item.toggle',
  guard: ({snapshot, event}) =>
    selectors.isActiveListItem(event.listItem)(snapshot),
  actions: [
    ({event}) => [
      raise({
        type: 'list item.remove',
        listItem: event.listItem,
      }),
    ],
  ],
})

const toggleListItemOn = defineBehavior({
  on: 'list item.toggle',
  guard: ({snapshot, event}) =>
    !selectors.isActiveListItem(event.listItem)(snapshot),
  actions: [
    ({event}) => [
      raise({
        type: 'list item.add',
        listItem: event.listItem,
      }),
    ],
  ],
})

const toggleStyleOff = defineBehavior({
  on: 'style.toggle',
  guard: ({snapshot, event}) => selectors.isActiveStyle(event.style)(snapshot),
  actions: [({event}) => [raise({type: 'style.remove', style: event.style})]],
})

const toggleStyleOn = defineBehavior({
  on: 'style.toggle',
  guard: ({snapshot, event}) => !selectors.isActiveStyle(event.style)(snapshot),
  actions: [({event}) => [raise({type: 'style.add', style: event.style})]],
})

const raiseDeserializationSuccessOrFailure = defineBehavior({
  on: 'deserialize',
  guard: ({snapshot, event}) => {
    const deserializeEvents = snapshot.context.converters.flatMap(
      (converter) => {
        const data = event.dataTransfer.getData(converter.mimeType)

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
        dataTransfer: event.dataTransfer,
        originEvent: event.originEvent,
      }),
    ],
  ],
})

const raiseInsertBlocks = defineBehavior({
  on: 'deserialization.success',
  guard: ({snapshot, event}) => {
    const draggingEntireBlocks = snapshot.beta.internalDrag
      ? selectors.isSelectingEntireBlocks({
          ...snapshot,
          context: {
            ...snapshot.context,
            selection: snapshot.beta.internalDrag.origin.selection,
          },
        })
      : false

    const placement: InsertPlacement = draggingEntireBlocks
      ? event.originEvent.position.block === 'start'
        ? 'before'
        : event.originEvent.position.block === 'end'
          ? 'after'
          : 'auto'
      : 'auto'

    return {placement}
  },
  actions: [
    ({event}, {placement}) => [
      raise({
        type: 'insert.blocks',
        blocks: event.data,
        placement,
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
          dataTransfer: event.dataTransfer,
        })
      }),
  ],
})

const raiseDataTransferSet = defineBehavior({
  on: 'serialization.success',
  actions: [
    ({event}) => [
      raise({
        type: 'data transfer.set',
        data: event.data,
        dataTransfer: event.dataTransfer,
        mimeType: event.mimeType,
      }),
    ],
  ],
})

export const defaultBehaviors = [
  defineBehavior({
    on: 'delete',
    guard: ({snapshot, event}) => {
      const selectingEntireBlocks = selectors.isSelectingEntireBlocks({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: event.selection,
        },
      })

      if (!selectingEntireBlocks) {
        return false
      }

      const selectedBlocks = selectors.getSelectedBlocks({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: event.selection,
        },
      })

      return {selectedBlocks}
    },
    actions: [
      (_, {selectedBlocks}) =>
        selectedBlocks.map((selectedBlock) =>
          raise({
            type: 'delete.block',
            blockPath: selectedBlock.path,
          }),
        ),
    ],
  }),
  defineBehavior({
    on: 'copy',
    guard: ({snapshot}) => {
      const focusSpan = selectors.getFocusSpan(snapshot)
      const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)

      return focusSpan && selectionCollapsed
    },
    actions: [() => [{type: 'noop'}]],
  }),
  defineBehavior({
    on: 'copy',
    actions: [
      ({event}) => [
        raise({
          type: 'serialize',
          dataTransfer: event.data,
          originEvent: event,
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'cut',
    guard: ({snapshot}) => {
      const focusSpan = selectors.getFocusSpan(snapshot)
      const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)

      return focusSpan && selectionCollapsed
    },
    actions: [() => [{type: 'noop'}]],
  }),
  defineBehavior({
    on: 'cut',
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
          dataTransfer: event.dataTransfer,
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
          dataTransfer: event.dataTransfer,
          originEvent: event,
        }),
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

      return !droppingOnDragOrigin
    },
    actions: [
      ({snapshot, event}) => [
        raise({
          type: 'deserialize',
          dataTransfer: event.dataTransfer,
          originEvent: event,
        }),
        raise({
          type: 'select',
          selection: event.position.selection,
        }),
        ...(snapshot.beta.internalDrag
          ? [
              raise({
                type: 'delete',
                selection: snapshot.beta.internalDrag.origin.selection,
              }),
            ]
          : []),
      ],
    ],
  }),
  defineBehavior({
    on: 'paste',
    actions: [
      ({event}) => [
        raise({
          type: 'deserialize',
          dataTransfer: event.data,
          originEvent: event,
        }),
      ],
    ],
  }),
  toggleAnnotationOff,
  toggleAnnotationOn,
  toggleDecoratorOff,
  toggleDecoratorOn,
  toggleListItemOff,
  toggleListItemOn,
  toggleStyleOff,
  toggleStyleOn,
  raiseDeserializationSuccessOrFailure,
  raiseInsertBlocks,
  raiseSerializationSuccessOrFailure,
  raiseDataTransferSet,
  raiseInsertSoftBreak,
]
