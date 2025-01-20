import {sliceBlocks} from '../utils'
import type {Converter} from './converter'

export const converterPortableText: Converter<'application/x-portable-text'> = {
  serialize: ({context}) => {
    if (!context.selection) {
      return {
        type: 'serialization.failure',
        mimeType: 'application/x-portable-text',
      }
    }

    const blocks = sliceBlocks({
      blocks: context.value,
      selection: context.selection,
    })

    return {
      type: 'serialization.success',
      data: JSON.stringify(blocks),
      mimeType: 'application/x-portable-text',
    }
  },
  deserialize: ({event}) => {
    return {
      type: 'deserialization.success',
      data: JSON.parse(event.data),
      mimeType: 'application/x-portable-text',
    }
  },
  mimeType: 'application/x-portable-text',
}
