import {parseBlock} from '../internal-utils/parse-blocks'
import {sliceBlocks} from '../utils'
import {defineConverter} from './converter.types'

export const converterPortableText = defineConverter({
  mimeType: 'application/x-portable-text',
  serialize: ({snapshot, event}) => {
    const selection =
      snapshot.beta.internalDrag?.origin.selection ?? snapshot.context.selection

    if (!selection) {
      return {
        type: 'serialization.failure',
        mimeType: 'application/x-portable-text',
        originEvent: event.originEvent,
        reason: 'No selection',
      }
    }

    const blocks = sliceBlocks({
      blocks: snapshot.context.value,
      selection,
    })

    if (blocks.length === 0) {
      return {
        type: 'serialization.failure',
        mimeType: 'application/x-portable-text',
        reason: 'No blocks serialized',
        originEvent: event.originEvent,
      }
    }

    return {
      type: 'serialization.success',
      data: JSON.stringify(blocks),
      mimeType: 'application/x-portable-text',
      originEvent: event.originEvent,
    }
  },
  deserialize: ({snapshot, event}) => {
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
        context: snapshot.context,
        block,
        options: {
          /**
           * If we are dragging internally then we would like to keep the
           * dropped portable text as is.
           */
          refreshKeys: !snapshot.beta.hasTag?.('dragging internally'),
        },
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
