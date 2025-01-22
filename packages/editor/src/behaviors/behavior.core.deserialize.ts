import {defineBehavior, raise} from './behavior.types'

export const coreDeserializeBehavior = defineBehavior({
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
      (deserializeEvent) => deserializeEvent.type === 'deserialization.success',
    )

    if (!firstSuccess) {
      return {
        type: 'deserialization.failure',
        mimeType: '*/*',
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
