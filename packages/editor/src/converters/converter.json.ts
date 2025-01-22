import type {Converter} from './converter'

export const converterJson: Converter<'application/json'> = {
  serialize: ({context, event}) => {
    const portableTextConverter = context.converters.find(
      (converter) => converter.mimeType === 'application/x-portable-text',
    )

    if (!portableTextConverter) {
      return {
        type: 'serialization.failure',
        mimeType: 'application/json',
        originEvent: event.originEvent,
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
  mimeType: 'application/json',
}
