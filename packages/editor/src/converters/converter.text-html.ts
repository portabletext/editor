import {htmlToBlocks} from '@portabletext/block-tools'
import type {PortableTextBlock} from '@sanity/types'
import type {Converter} from './converter'

export const converterTextHtml: Converter<'text/html'> = {
  serialize: () => {
    return {
      type: 'serialization.failure',
      mimeType: 'text/html',
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
