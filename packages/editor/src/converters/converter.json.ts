import type {Converter} from './converter'
import {converterPortableText} from './converter.portable-text'

export const converterJson: Converter<'application/json'> = {
  serialize: ({context, event}) => {
    const serializationEvent = converterPortableText.serialize({
      context,
      event,
    })

    return {
      ...serializationEvent,
      mimeType: 'application/json',
    }
  },
  deserialize: () => {
    return {
      type: 'deserialization.failure',
      mimeType: 'application/json',
    }
  },
  mimeType: 'application/json',
}
