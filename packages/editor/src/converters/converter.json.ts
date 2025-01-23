import {defineConverter} from './converter.types'

export const converterJson = defineConverter({
  mimeType: 'application/json',
  serialize: ({context, event}) => {
    const portableTextConverter = context.converters.find(
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
      context,
      event,
    })

    return {
      ...serializationEvent,
      mimeType: 'application/json',
      originEvent: event.originEvent,
    }
  },
  deserialize: ({context, event}) => {
    const portableTextConverter = context.converters.find(
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
      context,
      event,
    })

    return {
      ...deserializationEvent,
      mimeType: 'application/json',
    }
  },
})
