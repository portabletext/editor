import {defineConverter} from './converter.types'

export const converterJson = defineConverter({
  mimeType: 'application/json',
  serialize: ({snapshot, event}) => {
    const portableTextConverter = snapshot.context.converters.find(
      (converter) => converter.mimeType === 'application/x-portable-text',
    )

    if (!portableTextConverter) {
      return {
        type: 'serialization.failure',
        mimeType: 'application/json',
        originEvent: event.originEvent,
        reason: 'No application/x-portable-text Converter found',
      }
    }

    const serializationEvent = portableTextConverter.serialize({
      snapshot,
      event,
    })

    return {
      ...serializationEvent,
      mimeType: 'application/json',
      originEvent: event.originEvent,
    }
  },
  deserialize: ({snapshot, event}) => {
    const portableTextConverter = snapshot.context.converters.find(
      (converter) => converter.mimeType === 'application/x-portable-text',
    )

    if (!portableTextConverter) {
      return {
        type: 'deserialization.failure',
        mimeType: 'application/json',
        reason: 'No application/x-portable-text Converter found',
      }
    }

    const deserializationEvent = portableTextConverter.deserialize({
      snapshot,
      event,
    })

    return {
      ...deserializationEvent,
      mimeType: 'application/json',
    }
  },
})
