import type {PortableTextTextBlock} from '@sanity/types'
import type {EditorSelectionPoint} from '..'
import type {EditorContext} from '../editor/editor-snapshot'
import {isSpan} from './util.is-span'
import {isTextBlock} from './util.is-text-block'
import {sliceBlocks} from './util.slice-blocks'

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

  const before = sliceBlocks({
    blocks: [block],
    selection: {
      anchor: {
        path: [{_key: block._key}, 'children', {_key: firstChild._key}],
        offset: 0,
      },
      focus: point,
    },
  }).at(0)
  const after = sliceBlocks({
    blocks: [block],
    selection: {
      anchor: point,
      focus: {
        path: [{_key: block._key}, 'children', {_key: lastChild._key}],
        offset: isSpan(context, lastChild) ? lastChild.text.length : 0,
      },
    },
  }).at(0)

  if (!before || !after) {
    return undefined
  }

  if (!isTextBlock(context, before) || !isTextBlock(context, after)) {
    return undefined
  }

  return {before, after}
}
