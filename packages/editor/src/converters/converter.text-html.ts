import {htmlToBlocks} from '@portabletext/block-tools'
import {toHTML} from '@portabletext/to-html'
import type {PortableTextBlock} from '@sanity/types'
import {parseBlock} from '../internal-utils/parse-blocks'
import * as selectors from '../selectors'
import type {PortableTextMemberSchemaTypes} from '../types/editor'
import {defineConverter} from './converter.types'

export function createConverterTextHtml(
  legacySchema: PortableTextMemberSchemaTypes,
) {
  return defineConverter({
    mimeType: 'text/html',
    serialize: ({snapshot, event}) => {
      const selection = snapshot.context.selection

      if (!selection) {
        return {
          type: 'serialization.failure',
          mimeType: 'text/html',
          originEvent: event.originEvent,
          reason: 'No selection',
        }
      }

      const blocks = selectors.getSelectedValue(snapshot)

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
      const blocks = htmlToBlocks(event.data, legacySchema.portableText, {
        keyGenerator: snapshot.context.keyGenerator,
        unstable_whitespaceOnPasteMode:
          legacySchema.block.options.unstable_whitespaceOnPasteMode,
      }) as Array<PortableTextBlock>

      const parsedBlocks = blocks.flatMap((block) => {
        const parsedBlock = parseBlock({
          context: snapshot.context,
          block,
          options: {
            refreshKeys: false,
            validateFields: true,
          },
        })
        return parsedBlock ? [parsedBlock] : []
      })

      if (parsedBlocks.length === 0) {
        return {
          type: 'deserialization.failure',
          mimeType: 'text/html',
          reason: 'No blocks deserialized',
        }
      }

      return {
        type: 'deserialization.success',
        data: parsedBlocks,
        mimeType: 'text/html',
      }
    },
  })
}
