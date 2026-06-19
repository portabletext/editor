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
          mimeType: 'text/markdown',
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

      // Forward the `position` field from the originating native event
      // so converters can branch on it. Currently only `drag.dragstart`
      // carries a relevant signal (`isContainer` distinguishes chrome
      // drag from in-content drag); other origins pass `undefined`.
      const position =
        event.originEvent.type === 'drag.dragstart'
          ? {isContainer: event.originEvent.position.isContainer}
          : undefined

      return converter.serialize({
        snapshot,
        event: {
          type: 'serialize',
          originEvent: event.originEvent.type,
          position,
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
