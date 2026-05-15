import {
  markdownToPortableText,
  portableTextToMarkdown,
} from '@portabletext/markdown'
import {getFragment} from '../selectors/selector.get-fragment'
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

    const blocks = getFragment(snapshot).map((entry) => entry.node)

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
        keyGenerator: snapshot.context.keyGenerator,
        block,
        options: {
          normalize: false,
          removeUnusedMarkDefs: true,
          validateFields: false,
        },
        schema: snapshot.context.schema,
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
