import {htmlToPortableText} from '@portabletext/html'
import {isTextBlock} from '@portabletext/schema'
import {getBlockObjectSchema} from '../schema/get-block-object-schema'
import {getBlockSubSchema} from '../schema/get-block-sub-schema'
import {getSelectedValue} from '../selectors/selector.get-selected-value'
import {getSelectionStartBlock} from '../selectors/selector.get-selection-start-block'
import {parseBlock} from '../utils/parse-blocks'
import {defineConverter} from './converter.types'

export const converterTextPlain = defineConverter({
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

    const blocks = getSelectedValue(snapshot)
    // All selected blocks share a container scope (or all live at the
    // root). Use the start block's path as the scope anchor for resolving
    // the sub-schema.
    const scopeAnchor = getSelectionStartBlock(snapshot)

    const data = blocks
      .map((block) => {
        if (isTextBlock(snapshot.context, block)) {
          const inlineObjects = scopeAnchor
            ? getBlockSubSchema(snapshot.context, scopeAnchor.path)
                .inlineObjects
            : snapshot.context.schema.inlineObjects
          return block.children
            .map((child) => {
              if (child._type === snapshot.context.schema.span.name) {
                return child.text
              }

              return event.originEvent === 'drag.dragstart'
                ? `[${
                    inlineObjects.find(
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
              (scopeAnchor
                ? getBlockObjectSchema(
                    snapshot.context,
                    block,
                    scopeAnchor.path,
                  )
                : snapshot.context.schema.blockObjects.find(
                    (blockObjectType) => blockObjectType.name === block._type,
                  )
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
        line ? `<p>${line.replace(/(?:\r\n|\r|\n)/g, '<br/>')}</p>` : '<p></p>',
      )
      .join('')

    const textToHtml = `<html><body>${html}</body></html>`

    const blocks = htmlToPortableText(textToHtml, {
      schema: snapshot.context.schema,
      keyGenerator: snapshot.context.keyGenerator,
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
  return String(str).replace(
    /[&<>"'`=/]/g,
    (s: string) => entityMap[s as keyof typeof entityMap] ?? s,
  )
}
