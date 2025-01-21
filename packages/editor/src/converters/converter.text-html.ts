import {htmlToBlocks} from '@portabletext/block-tools'
import {toHTML} from '@portabletext/to-html'
import type {PortableTextBlock} from '@sanity/types'
import {sliceBlocks} from '../utils'
import type {Converter} from './converter'

export const converterTextHtml: Converter<'text/html'> = {
  serialize: ({context, event}) => {
    if (!context.selection) {
      return {
        type: 'serialization.failure',
        mimeType: 'text/html',
        originEvent: event.originEvent,
      }
    }

    const blocks = sliceBlocks({
      blocks: context.value,
      selection: context.selection,
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
      }
    }

    return {
      type: 'serialization.success',
      data: html,
      mimeType: 'text/html',
      originEvent: event.originEvent,
    }
  },
  deserialize: ({context, event}) => {
    const blocks = htmlToBlocks(event.data, context.schema.portableText, {
      keyGenerator: context.keyGenerator,
      unstable_whitespaceOnPasteMode:
        context.schema.block.options.unstable_whitespaceOnPasteMode,
    }) as Array<PortableTextBlock>

    return {
      type: 'deserialization.success',
      data: blocks,
      mimeType: 'text/html',
    }
  },
  mimeType: 'text/html',
}
