import {defineBehavior, raise} from './behavior.types'

export const coreSerializeBehaviors = {
  'serialize': defineBehavior({
    on: 'serialize',
    guard: ({context, event}) => {
      if (context.converters.length === 0) {
        return false
      }

      const serializeEvents = context.converters.map((converter) =>
        converter.serialize({context, event}),
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
  }),
  'serialization.success': defineBehavior({
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
  }),
}
