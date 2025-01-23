import {htmlToBlocks} from '@portabletext/block-tools'
import {isPortableTextTextBlock, type PortableTextBlock} from '@sanity/types'
import {sliceBlocks} from '../utils'
import {defineConverter} from './converter.types'

export const converterTextPlain = defineConverter({
  mimeType: 'text/plain',
  serialize: ({context, event}) => {
    if (!context.selection) {
      return {
        type: 'serialization.failure',
        mimeType: 'text/plain',
        originEvent: event.originEvent,
        reason: 'No selection',
      }
    }

    const blocks = sliceBlocks({
      blocks: context.value,
      selection: context.selection,
    })

    const data = blocks
      .map((block) => {
        if (isPortableTextTextBlock(block)) {
          return block.children
            .map((child) => {
              if (child._type === context.schema.span.name) {
                return child.text
              }

              return `[${
                context.schema.inlineObjects.find(
                  (inlineObjectType) => inlineObjectType.name === child._type,
                )?.title ?? 'Object'
              }]`
            })
            .join('')
        }

        return `[${
          context.schema.blockObjects.find(
            (blockObjectType) => blockObjectType.name === block._type,
          )?.title ?? 'Object'
        }]`
      })
      .join('\n\n')

    return {
      type: 'serialization.success',
      data,
      mimeType: 'text/plain',
      originEvent: event.originEvent,
    }
  },
  deserialize: ({context, event}) => {
    const html = escapeHtml(event.data)
      .split(/\n{2,}/)
      .map((line) =>
        line ? `<p>${line.replace(/(?:\r\n|\r|\n)/g, '<br/>')}</p>` : '<p></p>',
      )
      .join('')

    const textToHtml = `<html><body>${html}</body></html>`

    const blocks = htmlToBlocks(textToHtml, context.schema.portableText, {
      keyGenerator: context.keyGenerator,
    }) as Array<PortableTextBlock>

    return {
      type: 'deserialization.success',
      data: blocks,
      mimeType: 'text/plain',
    }
  },
})

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
