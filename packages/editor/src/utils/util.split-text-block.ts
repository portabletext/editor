import {isSpan, type PortableTextTextBlock} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import type {Path} from '../slate/interfaces/path'
import type {EditorSelectionPoint} from '../types/editor'
import {isKeyedSegment} from './util.is-keyed-segment'
import {sliceTextBlock} from './util.slice-text-block'

/**
 * Extract the block path prefix from a selection point path.
 * Walks the path to find the segment matching the block key,
 * then returns everything up to and including the children field.
 * For a root-level block: [{_key: blockKey}, 'children']
 * For a container block: [{_key: containerKey}, 'content', {_key: blockKey}, 'children']
 */
function getChildrenPrefix(path: Path, blockKey: string): Path | undefined {
  for (let i = 0; i < path.length; i++) {
    const segment = path[i]
    if (isKeyedSegment(segment) && segment._key === blockKey) {
      const fieldName = path[i + 1]
      if (typeof fieldName === 'string') {
        return path.slice(0, i + 2)
      }
    }
  }
  return undefined
}

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

  const childrenPrefix = getChildrenPrefix(point.path, block._key) ?? [
    {_key: block._key},
    'children',
  ]

  const before = sliceTextBlock({
    context: {
      schema: context.schema,
      selection: {
        anchor: {
          path: [...childrenPrefix, {_key: firstChild._key}],
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
          path: [...childrenPrefix, {_key: lastChild._key}],
          offset: isSpan(context, lastChild) ? lastChild.text.length : 0,
        },
      },
    },
    block,
  })

  return {before, after}
}
