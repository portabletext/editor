import * as selectors from '../selectors'
import {blockOffsetsToSelection} from '../utils'
import {raiseInsertSoftBreak} from './behavior.default.raise-soft-break'
import {defineBehavior, raise} from './behavior.types'

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
  guard: ({snapshot, event}) => {
    const manualSelection = event.offsets
      ? blockOffsetsToSelection({
          value: snapshot.context.value,
          offsets: event.offsets,
        })
      : null

    if (manualSelection) {
      return !selectors.isActiveDecorator(event.decorator)({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: manualSelection,
        },
      })
    }

    return !selectors.isActiveDecorator(event.decorator)(snapshot)
  },
  actions: [
    ({event}) => [
      raise({
        ...event,
        type: 'decorator.add',
      }),
    ],
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
        raise({
          type: 'data transfer.set',
          data: event.data,
          dataTransfer: event.originEvent.originEvent.dataTransfer,
          mimeType: event.mimeType,
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
      return droppingOnDragOrigin
    },
    actions: [() => [{type: 'noop'}]],
  }),
  defineBehavior({
    on: 'drag.drop',
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
                blockPath: block.path,
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
  toggleAnnotationOff,
  toggleAnnotationOn,
  toggleDecoratorOff,
  toggleDecoratorOn,
  toggleListItemOff,
  toggleListItemOn,
  toggleStyleOff,
  toggleStyleOn,
  raiseDeserializationSuccessOrFailure,
  raiseSerializationSuccessOrFailure,
  raiseInsertSoftBreak,
]
