import {parseBlock} from '../internal-utils/parse-blocks'
import * as selectors from '../selectors'
import {defineConverter} from './converter.types'

export const converterPortableText = defineConverter({
  mimeType: 'application/x-portable-text',
  serialize: ({snapshot, event}) => {
    const selection = snapshot.context.selection

    if (!selection) {
      return {
        type: 'serialization.failure',
        mimeType: 'application/x-portable-text',
        originEvent: event.originEvent,
        reason: 'No selection',
      }
    }

    const blocks = selectors.getSelectedValue(snapshot)

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
          refreshKeys: true,
          validateFields: false,
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
