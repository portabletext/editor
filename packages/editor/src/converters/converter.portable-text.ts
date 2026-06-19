import {safeParse, safeStringify} from '../internal-utils/safe-json'
import {getDragFragment, getFragment} from '../selectors/selector.get-fragment'
import {parseBlock} from '../utils/parse-blocks'
import {defineConverter} from './converter.types'

export const converterPortableText = defineConverter({
  mimeType: 'application/x-portable-text',
  serialize: ({snapshot, event}) => {
    const selection = snapshot.context.selection

    if (!selection) {
      return {
        type: 'serialization.failure',
        mimeType: 'application/x-portable-text',
        originEvent: event.originEvent,
        reason: 'No selection',
      }
    }

    // Dragging a container by its chrome serializes the container
    // envelope intact: dropping a callout that wraps a paragraph should
    // re-create the callout at the destination, not just the paragraph.
    // Every other origin (clipboard copy/cut, in-content drag) unwraps
    // to the smallest top-level-valid fragment so the destination shape
    // wins.
    const draggingContainer =
      event.originEvent === 'drag.dragstart' &&
      event.position?.isContainer === true
    const blocks = (
      draggingContainer ? getDragFragment(snapshot) : getFragment(snapshot)
    ).map((entry) => entry.node)

    if (blocks.length === 0) {
      return {
        type: 'serialization.failure',
        mimeType: 'application/x-portable-text',
        reason: 'No blocks serialized',
        originEvent: event.originEvent,
      }
    }

    return {
      type: 'serialization.success',
      data: safeStringify(blocks),
      mimeType: 'application/x-portable-text',
      originEvent: event.originEvent,
    }
  },
  deserialize: ({snapshot, event}) => {
    const blocks = safeParse(event.data)

    if (!Array.isArray(blocks)) {
      return {
        type: 'deserialization.failure',
        mimeType: 'application/x-portable-text',
        reason: 'Data is not an array',
      }
    }

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

    if (parsedBlocks.length === 0 && blocks.length > 0) {
      return {
        type: 'deserialization.failure',
        mimeType: 'application/x-portable-text',
        reason: 'No blocks were parsed',
      }
    }

    return {
      type: 'deserialization.success',
      data: parsedBlocks,
      mimeType: 'application/x-portable-text',
    }
  },
})
