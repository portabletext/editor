import {htmlToBlocks} from '@portabletext/block-tools'
import {isPortableTextTextBlock, type PortableTextBlock} from '@sanity/types'
import {parseBlock} from '../internal-utils/parse-blocks'
import type {PortableTextMemberSchemaTypes} from '../types/editor'
import {sliceBlocks} from '../utils'
import {defineConverter} from './converter.types'

export function createConverterTextPlain(
  legacySchema: PortableTextMemberSchemaTypes,
) {
  return defineConverter({
    mimeType: 'text/plain',
    serialize: ({snapshot, event}) => {
      const selection =
        snapshot.beta.internalDrag?.origin.selection ??
        snapshot.context.selection

      if (!selection) {
        return {
          type: 'serialization.failure',
          mimeType: 'text/plain',
          originEvent: event.originEvent,
          reason: 'No selection',
        }
      }

      const blocks = sliceBlocks({
        blocks: snapshot.context.value,
        selection,
      })

      const data = blocks
        .map((block) => {
          if (isPortableTextTextBlock(block)) {
            return block.children
              .map((child) => {
                if (child._type === snapshot.context.schema.span.name) {
                  return child.text
                }

                return snapshot.beta.hasTag('dragging internally')
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

          return snapshot.beta.hasTag('dragging internally')
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
