import {
  markdownToPortableText,
  portableTextToMarkdown,
} from '@portabletext/markdown'
import {getSelectedValue} from '../selectors/selector.get-selected-value'
import {parseBlock} from '../utils/parse-blocks'
import {defineConverter} from './converter.types'

export const converterTextMarkdown = defineConverter({
  mimeType: 'text/markdown',
  serialize: ({snapshot, event}) => {
    const selection = snapshot.context.selection

    if (!selection) {
      return {
        type: 'serialization.failure',
        mimeType: 'text/markdown',
        reason: 'No selection',
        originEvent: event.originEvent,
      }
    }

    const blocks = getSelectedValue(snapshot)

    const markdown = portableTextToMarkdown(blocks)

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

    const parsedBlocks = blocks.flatMap((block) => {
      const parsedBlock = parseBlock({
        context: snapshot.context,
        block,
        options: {
          normalize: false,
          removeUnusedMarkDefs: true,
          validateFields: false,
        },
      })
      return parsedBlock ? [parsedBlock] : []
    })

    if (parsedBlocks.length === 0) {
      return {
        type: 'deserialization.failure',
        mimeType: 'text/markdown',
        reason: 'No blocks deserialized',
      }
    }

    return {
      type: 'deserialization.success',
      data: parsedBlocks,
      mimeType: 'text/markdown',
    }
  },
})
