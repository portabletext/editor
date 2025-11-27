import {
  markdownToPortableText,
  portableTextToMarkdown,
} from '@portabletext/markdown'
import {getSelectedValue} from '../selectors/selector.get-selected-value'
import {defineConverter} from './converter.types'

export const converterTextMarkdown = defineConverter({
  mimeType: 'text/markdown',
  serialize: ({snapshot, event}) => {
    const selection = snapshot.context.selection

    if (!selection) {
      return {
        type: 'serialization.failure',
        mimeType: 'text/markdown',
        originEvent: event.originEvent,
        reason: 'No selection',
      }
    }

    const blocks = getSelectedValue(snapshot)

    const markdown = portableTextToMarkdown(blocks, {
      components: {
        types: {
          image: ({value}) => `![${value.alt || 'Image'}](${value.src})`,
        },
      },
    })

    return {
      type: 'serialization.success',
      data: markdown,
      mimeType: 'text/markdown',
      originEvent: event.originEvent,
    }
  },
  deserialize: ({snapshot, event}) => {
    const blocks = markdownToPortableText(event.data, {
      keyGenerator: snapshot.context.keyGenerator,
      schema: snapshot.context.schema,
    })

    if (blocks.length === 0) {
      return {
        type: 'deserialization.failure',
        mimeType: 'text/markdown',
        reason: 'No blocks deserialized',
      }
    }

    return {
      type: 'deserialization.success',
      data: blocks,
      mimeType: 'text/markdown',
    }
  },
})
