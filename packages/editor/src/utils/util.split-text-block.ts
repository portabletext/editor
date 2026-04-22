import {isSpan, type PortableTextTextBlock} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import type {EditorSelectionPoint} from '../types/editor'
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
  const lastChild = block.children.at(-1)

  if (!firstChild || !lastChild) {
    return undefined
  }

  const blockStartPoint: EditorSelectionPoint = {
    path: [{_key: block._key}, 'children', {_key: firstChild._key}],
    offset: 0,
  }
  const blockEndPoint: EditorSelectionPoint = {
    path: [{_key: block._key}, 'children', {_key: lastChild._key}],
    offset: isSpan(context, lastChild) ? lastChild.text.length : 0,
  }

  const before = sliceTextBlock({
    context,
    block,
    startPoint: blockStartPoint,
    endPoint: point,
  })
  const after = sliceTextBlock({
    context,
    block,
    startPoint: point,
    endPoint: blockEndPoint,
  })

  return {before, after}
}
