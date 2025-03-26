import type {KeyedSegment, PortableTextTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isTextBlock} from '../internal-utils/parse-blocks'
import {isKeyedSegment} from '../utils'

/**
 * @public
 */
export const getSelectedTextBlocks: EditorSelector<
  Array<{node: PortableTextTextBlock; path: [KeyedSegment]}>
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return []
  }

  const selectedTextBlocks: Array<{
    node: PortableTextTextBlock
    path: [KeyedSegment]
  }> = []
  const startKey = snapshot.context.selection.backward
    ? isKeyedSegment(snapshot.context.selection.focus.path[0])
      ? snapshot.context.selection.focus.path[0]._key
      : undefined
    : isKeyedSegment(snapshot.context.selection.anchor.path[0])
      ? snapshot.context.selection.anchor.path[0]._key
      : undefined
  const endKey = snapshot.context.selection.backward
    ? isKeyedSegment(snapshot.context.selection.anchor.path[0])
      ? snapshot.context.selection.anchor.path[0]._key
      : undefined
    : isKeyedSegment(snapshot.context.selection.focus.path[0])
      ? snapshot.context.selection.focus.path[0]._key
      : undefined

  if (!startKey || !endKey) {
    return selectedTextBlocks
  }

  for (const block of snapshot.context.value) {
    if (block._key === startKey) {
      if (isTextBlock(snapshot.context.schema, block)) {
        selectedTextBlocks.push({node: block, path: [{_key: block._key}]})
      }

      if (startKey === endKey) {
        break
      }
      continue
    }

    if (block._key === endKey) {
      if (isTextBlock(snapshot.context.schema, block)) {
        selectedTextBlocks.push({node: block, path: [{_key: block._key}]})
      }

      break
    }

    if (selectedTextBlocks.length > 0) {
      if (isTextBlock(snapshot.context.schema, block)) {
        selectedTextBlocks.push({node: block, path: [{_key: block._key}]})
      }
    }
  }

  return selectedTextBlocks
}
