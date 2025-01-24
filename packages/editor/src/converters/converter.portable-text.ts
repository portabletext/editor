import {parseBlock} from '../internal-utils/parse-blocks'
import {sliceBlocks} from '../utils'
import {defineConverter} from './converter.types'

export const converterPortableText = defineConverter({
  mimeType: 'application/x-portable-text',
  serialize: ({context, event}) => {
    if (!context.selection) {
      return {
        type: 'serialization.failure',
        mimeType: 'application/x-portable-text',
        originEvent: event.originEvent,
        reason: 'No selection',
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
        reason: 'Data is not an array',
      }
    }

    const parsedBlocks = blocks.flatMap((block) => {
      const parsedBlock = parseBlock({
        context,
        block,
        options: {refreshKeys: true},
      })
      return parsedBlock ? [parsedBlock] : []
    })

    if (parsedBlocks.length === 0 && blocks.length > 0) {
      return {
        type: 'deserialization.failure',
        mimeType: 'application/x-portable-text',
        reason: 'No blocks were parsed',
      }
    }

    return {
      type: 'deserialization.success',
      data: parsedBlocks,
      mimeType: 'application/x-portable-text',
    }
  },
})
