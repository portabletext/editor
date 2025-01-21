import {defineBehavior, raise} from './behavior.types'

export const coreSerializeBehavior = defineBehavior({
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
})
