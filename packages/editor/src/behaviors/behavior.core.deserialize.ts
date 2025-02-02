import {defineBehavior, raise} from './behavior.types'

export const coreDeserializeBehaviors = {
  'deserialize': defineBehavior({
    on: 'deserialize',
    guard: ({context, event}) => {
      const deserializeEvents = context.converters.flatMap((converter) => {
        const data = event.dataTransfer.getData(converter.mimeType)

        if (!data) {
          return []
        }

        return [
          converter.deserialize({context, event: {type: 'deserialize', data}}),
        ]
      })

      const firstSuccess = deserializeEvents.find(
        (deserializeEvent) =>
          deserializeEvent.type === 'deserialization.success',
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
  }),
  'deserialization.success': defineBehavior({
    on: 'deserialization.success',
    actions: [
      ({event}) => [
        raise({
          type: 'insert.blocks',
          blocks: event.data,
        }),
      ],
    ],
  }),
}
