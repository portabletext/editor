import {htmlToBlocks} from '@portabletext/block-tools'
import type {PortableTextBlock} from '@sanity/types'
import {isTextBlock, parseBlock} from '../internal-utils/parse-blocks'
import * as selectors from '../selectors'
import type {PortableTextMemberSchemaTypes} from '../types/editor'
import {defineConverter} from './converter.types'

export function createConverterTextPlain(
  legacySchema: PortableTextMemberSchemaTypes,
) {
  return defineConverter({
    mimeType: 'text/plain',
    serialize: ({snapshot, event}) => {
      const selection = snapshot.context.selection

      if (!selection) {
        return {
          type: 'serialization.failure',
          mimeType: 'text/plain',
          originEvent: event.originEvent,
          reason: 'No selection',
        }
      }

      const blocks = selectors.getSelectedValue(snapshot)

      const data = blocks
        .map((block) => {
          if (isTextBlock(snapshot.context, block)) {
            return block.children
              .map((child) => {
                if (child._type === snapshot.context.schema.span.name) {
                  return child.text
                }

                return event.originEvent === 'drag.dragstart'
                  ? `[${
                      snapshot.context.schema.inlineObjects.find(
                        (inlineObjectType) =>
                          inlineObjectType.name === child._type,
                      )?.title ?? 'Object'
                    }]`
                  : ''
              })
              .join('')
          }

          return event.originEvent === 'drag.dragstart'
            ? `[${
                snapshot.context.schema.blockObjects.find(
                  (blockObjectType) => blockObjectType.name === block._type,
                )?.title ?? 'Object'
              }]`
            : ''
        })
        .filter((block) => block !== '')
        .join('\n\n')

      return {
        type: 'serialization.success',
        data,
        mimeType: 'text/plain',
        originEvent: event.originEvent,
      }
    },
    deserialize: ({snapshot, event}) => {
      const html = escapeHtml(event.data)
        .split(/\n{2,}/)
        .map((line) =>
          line
            ? `<p>${line.replace(/(?:\r\n|\r|\n)/g, '<br/>')}</p>`
            : '<p></p>',
        )
        .join('')

      const textToHtml = `<html><body>${html}</body></html>`

      const blocks = htmlToBlocks(textToHtml, legacySchema.portableText, {
        keyGenerator: snapshot.context.keyGenerator,
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
          mimeType: 'text/plain',
          reason: 'No blocks deserialized',
        }
      }

      return {
        type: 'deserialization.success',
        data: parsedBlocks,
        mimeType: 'text/plain',
      }
    },
  })
}

const entityMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
}

function escapeHtml(str: string) {
  return String(str).replace(/[&<>"'`=/]/g, (s: string) => entityMap[s])
}
