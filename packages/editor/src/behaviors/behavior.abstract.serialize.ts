import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractSerializeBehaviors = [
  defineBehavior({
    on: 'serialize',
    actions: [
      ({event}) => [
        raise({
          type: 'serialize.data',
          mimeType: 'application/x-portable-text',
          originEvent: event.originEvent,
        }),
        raise({
          type: 'serialize.data',
          mimeType: 'application/json',
          originEvent: event.originEvent,
        }),
        raise({
          type: 'serialize.data',
          mimeType: 'text/html',
          originEvent: event.originEvent,
        }),
        raise({
          type: 'serialize.data',
          mimeType: 'text/plain',
          originEvent: event.originEvent,
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'serialize.data',
    guard: ({snapshot, event}) => {
      const converter = snapshot.context.converters.find(
        (converter) => converter.mimeType === event.mimeType,
      )

      if (!converter) {
        return false
      }

      return converter.serialize({
        snapshot,
        event: {
          type: 'serialize',
          originEvent: event.originEvent.type,
        },
      })
    },
    actions: [
      ({event}, serializeEvent) => [
        raise({
          ...serializeEvent,
          originEvent: event.originEvent,
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
]
