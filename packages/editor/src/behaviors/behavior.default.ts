import * as selectors from '../selectors'
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
      }),
    ],
  ],
})

const raiseInsertBlocks = defineBehavior({
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
})

const raiseSerializationSuccessOrFailure = defineBehavior({
  on: 'serialize',
  guard: ({snapshot, event}) => {
    if (snapshot.context.converters.length === 0) {
      return false
    }

    const serializeEvents = snapshot.context.converters.map((converter) =>
      converter.serialize({snapshot, event}),
    )

    if (serializeEvents.length === 0) {
      return false
    }

    return serializeEvents
  },
  actions: [
    ({event}, serializeEvents) =>
      serializeEvents.map((serializeEvent) =>
        raise({
          ...serializeEvent,
          dataTransfer: event.dataTransfer,
        }),
      ),
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
