import {htmlToBlocks} from '@portabletext/block-tools'
import {toHTML} from '@portabletext/to-html'
import type {PortableTextBlock} from '@sanity/types'
import {sliceBlocks} from '../utils'
import {defineConverter} from './converter.types'

export const converterTextHtml = defineConverter({
  mimeType: 'text/html',
  serialize: ({snapshot, event}) => {
    if (!snapshot.context.selection) {
      return {
        type: 'serialization.failure',
        mimeType: 'text/html',
        originEvent: event.originEvent,
        reason: 'No selection',
      }
    }

    const blocks = sliceBlocks({
      blocks: snapshot.context.value,
      selection: snapshot.context.selection,
    })

    const html = toHTML(blocks, {
      onMissingComponent: false,
      components: {
        unknownType: ({children}) =>
          children !== undefined ? `${children}` : '',
      },
    })

    if (html === '') {
      return {
        type: 'serialization.failure',
        mimeType: 'text/html',
        originEvent: event.originEvent,
        reason: 'Serialized HTML is empty',
      }
    }

    return {
      type: 'serialization.success',
      data: html,
      mimeType: 'text/html',
      originEvent: event.originEvent,
    }
  },
  deserialize: ({snapshot, event}) => {
    const blocks = htmlToBlocks(
      event.data,
      snapshot.context.schema.portableText,
      {
        keyGenerator: snapshot.context.keyGenerator,
        unstable_whitespaceOnPasteMode:
          snapshot.context.schema.block.options.unstable_whitespaceOnPasteMode,
      },
    ) as Array<PortableTextBlock>

    return {
      type: 'deserialization.success',
      data: blocks,
      mimeType: 'text/html',
    }
  },
})
