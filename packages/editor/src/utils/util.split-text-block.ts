import type {PortableTextTextBlock} from '@sanity/types'
import type {EditorSelectionPoint} from '..'
import type {EditorContext} from '../editor/editor-snapshot'
import {isSpan} from './util.is-span'
import {sliceTextBlock} from './util.slice-text-block'

/**
 * @beta
 */
export function splitTextBlock({
  context,
  block,
  point,
}: {
  context: Pick<EditorContext, 'schema'>
  block: PortableTextTextBlock
  point: EditorSelectionPoint
}): {before: PortableTextTextBlock; after: PortableTextTextBlock} | undefined {
  const firstChild = block.children.at(0)
  const lastChild = block.children.at(block.children.length - 1)

  if (!firstChild || !lastChild) {
    return undefined
  }

  const before = sliceTextBlock({
    context: {
      schema: context.schema,
      selection: {
        anchor: {
          path: [{_key: block._key}, 'children', {_key: firstChild._key}],
          offset: 0,
        },
        focus: point,
      },
    },
    block,
  })
  const after = sliceTextBlock({
    context: {
      schema: context.schema,
      selection: {
        anchor: point,
        focus: {
          path: [{_key: block._key}, 'children', {_key: lastChild._key}],
          offset: isSpan(context, lastChild) ? lastChild.text.length : 0,
        },
      },
    },
    block,
  })

  return {before, after}
}
