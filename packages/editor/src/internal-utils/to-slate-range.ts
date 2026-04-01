import {
  isSpan,
  isTextBlock,
  type PortableTextObject,
  type PortableTextSpan,
} from '@portabletext/schema'
import type {EditorContext, EditorSnapshot} from '../editor/editor-snapshot'
import {getNode} from '../node-traversal/get-node'
import {keyedPathToIndexedPath} from '../paths/keyed-path-to-indexed-path'
import type {Path} from '../slate/interfaces/path'
import type {Range} from '../slate/interfaces/range'
import type {EditorSelectionPoint} from '../types/editor'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {blockOffsetToSpanSelectionPoint} from '../utils/util.block-offset'
import {isEqualSelectionPoints} from '../utils/util.is-equal-selection-points'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../utils/util.selection-point'

export function toSlateRange(
  snapshot: {
    context: Pick<EditorContext, 'schema' | 'value' | 'selection'>
  } & Pick<EditorSnapshot, 'blockIndexMap'> & {
      slateEditor?: PortableTextSlateEditor
    },
): Range | null {
  if (!snapshot.context.selection) {
    return null
  }

  if (
    isEqualSelectionPoints(
      snapshot.context.selection.anchor,
      snapshot.context.selection.focus,
    )
  ) {
    const anchorPoint = toSlateSelectionPoint(
      snapshot,
      snapshot.context.selection.anchor,
      snapshot.context.selection.backward ? 'backward' : 'forward',
    )

    if (!anchorPoint) {
      return null
    }

    return {
      anchor: anchorPoint,
      focus: anchorPoint,
    }
  }

  const anchorPoint = toSlateSelectionPoint(
    snapshot,
    snapshot.context.selection.anchor,
    snapshot.context.selection.backward ? 'forward' : 'backward',
  )
  const focusPoint = toSlateSelectionPoint(
    snapshot,
    snapshot.context.selection.focus,
    snapshot.context.selection.backward ? 'backward' : 'forward',
  )

  if (!anchorPoint || !focusPoint) {
    return null
  }

  return {
    anchor: anchorPoint,
    focus: focusPoint,
  }
}

function toSlateSelectionPoint(
  snapshot: {
    context: Pick<EditorContext, 'schema' | 'value'>
  } & Pick<EditorSnapshot, 'blockIndexMap'> & {
      slateEditor?: PortableTextSlateEditor
    },
  selectionPoint: EditorSelectionPoint,
  direction: 'forward' | 'backward',
):
  | {
      path: Path
      offset: number
    }
  | undefined {
  // Try full keyed path resolution when slateEditor is available
  if (snapshot.slateEditor) {
    const indexedPath = keyedPathToIndexedPath(
      snapshot.slateEditor,
      selectionPoint.path,
      snapshot.blockIndexMap,
    )

    if (indexedPath) {
      const entry = getNode(snapshot.slateEditor, indexedPath)

      if (entry) {
        // If the resolved node is a span, clamp the offset to the text length
        if (isSpan(snapshot.context, entry.node)) {
          return {
            path: indexedPath,
            offset: Math.min(
              typeof entry.node.text === 'string' ? entry.node.text.length : 0,
              selectionPoint.offset,
            ),
          }
        }

        // For non-span nodes (blocks, containers, inline objects), return
        // the path with offset as-is. The depth-2 fallback below handles
        // text block resolution to the first child when needed.
      }
    }
  }

  // Fallback: depth-2 resolution for backward compatibility
  const blockKey = getBlockKeyFromSelectionPoint(selectionPoint)

  if (!blockKey) {
    return undefined
  }

  const blockIndex = snapshot.blockIndexMap.get(blockKey)

  if (blockIndex === undefined) {
    return undefined
  }

  const block = snapshot.context.value.at(blockIndex)

  if (!block) {
    return undefined
  }

  if (!isTextBlock(snapshot.context, block)) {
    return {
      path: [blockIndex],
      offset: 0,
    }
  }

  let childKey = getChildKeyFromSelectionPoint({
    path: selectionPoint.path,
    offset: 0,
  })

  // If the block is a text block, but there is no child key in the selection
  // point path, then we can try to find a span selection point by the offset.
  const spanSelectionPoint = !childKey
    ? blockOffsetToSpanSelectionPoint({
        context: {
          schema: snapshot.context.schema,
          value: [block],
        },
        blockOffset: {
          path: [{_key: blockKey}],
          offset: selectionPoint.offset,
        },
        direction,
      })
    : undefined

  childKey = spanSelectionPoint
    ? getChildKeyFromSelectionPoint(spanSelectionPoint)
    : childKey

  // If we still don't have a child key, then we have to resort to selecting
  // the first child of the block (which by Slate convention is a span).
  if (!childKey) {
    return {
      path: [blockIndex, 0],
      offset: 0,
    }
  }

  let offset = spanSelectionPoint?.offset ?? selectionPoint.offset
  let childPath: Array<number> = []
  let childIndex = -1
  let pathChild: PortableTextSpan | PortableTextObject | undefined

  for (const child of block.children) {
    childIndex++
    if (child._key === childKey) {
      pathChild = child
      if (isSpan(snapshot.context, child)) {
        childPath = [childIndex]
      } else {
        // ObjectNodes have a spacer text node in the DOM for cursor
        // anchoring. The selection resolves to the ObjectNode path.
        childPath = [childIndex]
        offset = 0
      }
      break
    }
  }

  // If we for some unforeseen reason didn't manage to produce a child path,
  // then we have to resort to selecting the first child of the block (which
  // by Slate convention is a span).
  if (childPath.length === 0) {
    return {
      path: [blockIndex, 0],
      offset: 0,
    }
  }

  return {
    path: [blockIndex].concat(childPath),
    offset: isSpan(snapshot.context, pathChild)
      ? Math.min(pathChild.text.length, offset)
      : offset,
  }
}
