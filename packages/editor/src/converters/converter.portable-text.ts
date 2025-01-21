import {parseBlock} from '../internal-utils/parse-blocks'
import {sliceBlocks} from '../utils'
import type {Converter} from './converter'

export const converterPortableText: Converter<'application/x-portable-text'> = {
  serialize: ({context, event}) => {
    if (!context.selection) {
      return {
        type: 'serialization.failure',
        mimeType: 'application/x-portable-text',
        originEvent: event.originEvent,
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
      originEvent: event.originEvent,
    }
  },
  deserialize: ({context, event}) => {
    const blocks = JSON.parse(event.data)

    if (!Array.isArray(blocks)) {
      return {
        type: 'deserialization.failure',
        mimeType: 'application/x-portable-text',
      }
    }

    const parsedBlocks = blocks.flatMap((block) => {
      const parsedBlock = parseBlock({context, block})
      return parsedBlock ? [parsedBlock] : []
    })

    if (parsedBlocks.length === 0 && blocks.length > 0) {
      return {
        type: 'deserialization.failure',
        mimeType: 'application/x-portable-text',
      }
    }

    return {
      type: 'deserialization.success',
      data: parsedBlocks,
      mimeType: 'application/x-portable-text',
    }
  },
  mimeType: 'application/x-portable-text',
}
