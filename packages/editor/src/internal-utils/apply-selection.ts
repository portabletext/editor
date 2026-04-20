import {isSpan, isTextBlock} from '@portabletext/schema'
import {getChildren} from '../node-traversal/get-children'
import {getLeaf} from '../node-traversal/get-leaf'
import {getNode} from '../node-traversal/get-node'
import {end as editorEnd} from '../slate/editor/end'
import {start as editorStart} from '../slate/editor/start'
import type {Path} from '../slate/interfaces/path'
import type {Point} from '../slate/interfaces/point'
import type {Range} from '../slate/interfaces/range'
import {isPoint} from '../slate/point/is-point'
import {pointEquals} from '../slate/point/point-equals'
import {isRange} from '../slate/range/is-range'
import type {EditorSelection} from '../types/editor'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {blockOffsetToSpanSelectionPoint} from '../utils/util.block-offset'
import {isEqualSelectionPoints} from '../utils/util.is-equal-selection-points'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../utils/util.selection-point'

type ResolveSelectionEditor = Pick<
  PortableTextSlateEditor,
  'children' | 'schema' | 'containers'
>

/**
 * Normalize a selection so that each point resolves to a valid leaf path.
 *
 * Handles block-level paths by descending to the appropriate child,
 * recovers from missing children by falling back to the first child, and
 * clamps offsets to the text length for spans and to 0 for non-span nodes.
 *
 * Works at any depth, including inside containers.
 */
export function resolveSelection(
  editor: ResolveSelectionEditor,
  selection: EditorSelection,
): Range | null {
  if (!selection) {
    return null
  }

  if (isEqualSelectionPoints(selection.anchor, selection.focus)) {
    const anchorPoint = resolveSelectionPoint(
      editor,
      selection.anchor,
      selection.backward ? 'backward' : 'forward',
    )

    if (!anchorPoint) {
      return null
    }

    return {
      anchor: anchorPoint,
      focus: anchorPoint,
    }
  }

  const anchorPoint = resolveSelectionPoint(
    editor,
    selection.anchor,
    selection.backward ? 'forward' : 'backward',
  )
  const focusPoint = resolveSelectionPoint(
    editor,
    selection.focus,
    selection.backward ? 'backward' : 'forward',
  )

  if (!anchorPoint || !focusPoint) {
    return null
  }

  return {
    anchor: anchorPoint,
    focus: focusPoint,
  }
}

function resolveSelectionPoint(
  editor: ResolveSelectionEditor,
  selectionPoint: {path: Path; offset: number},
  direction: 'forward' | 'backward',
):
  | {
      path: Path
      offset: number
    }
  | undefined {
  const context = {
    schema: editor.schema,
    containers: editor.containers,
    value: editor.children,
  }

  const entry = getNode(context, selectionPoint.path)

  if (entry) {
    const children = getChildren(context, entry.path)

    // Leaf node (span, inline object, block object). Clamp offset.
    if (children.length === 0) {
      return {
        path: entry.path,
        offset: isSpan({schema: editor.schema}, entry.node)
          ? Math.min(entry.node.text.length, selectionPoint.offset)
          : 0,
      }
    }

    // Text block with a block-level offset (no child key in path).
    // Resolve the offset to a specific span position.
    if (
      isTextBlock({schema: editor.schema}, entry.node) &&
      !getChildKeyFromSelectionPoint(selectionPoint)
    ) {
      const spanPoint = blockOffsetToSpanSelectionPoint({
        context: {
          schema: editor.schema,
          value: [entry.node],
          containers: editor.containers,
        },
        blockOffset: {
          path: [{_key: entry.node._key}],
          offset: selectionPoint.offset,
        },
        direction,
      })

      if (spanPoint) {
        return {
          path: [
            ...entry.path,
            'children',
            {_key: getChildKeyFromSelectionPoint(spanPoint)!},
          ],
          offset: spanPoint.offset,
        }
      }
    }

    // Non-leaf, non-text-block (container or text block without offset).
    // Descend to the nearest leaf.
    const leaf = getLeaf(context, entry.path, {
      edge: direction === 'forward' ? 'start' : 'end',
    })

    return leaf ? {path: leaf.path, offset: 0} : {path: entry.path, offset: 0}
  }

  // Path doesn't resolve (e.g. a child was removed).
  // Fall back to the first leaf of the block.
  const blockKey = getBlockKeyFromSelectionPoint(selectionPoint)

  if (!blockKey) {
    return undefined
  }

  const blockEntry = getNode(context, [{_key: blockKey}])

  if (!blockEntry) {
    return undefined
  }

  const leaf = getLeaf(context, blockEntry.path, {edge: 'start'})

  return leaf
    ? {path: leaf.path, offset: 0}
    : {path: blockEntry.path, offset: 0}
}

/**
 * Set the editor selection to the given target.
 */
export function applySelect(
  editor: PortableTextSlateEditor,
  target: Range | Point | Path,
): void {
  const range = toRange(editor, target)
  const {selection} = editor

  if (selection) {
    const oldProps: Partial<Range> = {}
    const newProps: Partial<Range> = {}

    if (range.anchor != null && !pointEquals(range.anchor, selection.anchor)) {
      oldProps.anchor = selection.anchor
      newProps.anchor = range.anchor
    }

    if (range.focus != null && !pointEquals(range.focus, selection.focus)) {
      oldProps.focus = selection.focus
      newProps.focus = range.focus
    }

    if (Object.keys(oldProps).length > 0) {
      editor.apply({
        type: 'set_selection',
        properties: oldProps,
        newProperties: newProps,
      })
    }
  } else {
    editor.apply({
      type: 'set_selection',
      properties: null,
      newProperties: range,
    })
  }
}

/**
 * Clear the editor selection.
 */
export function applyDeselect(editor: PortableTextSlateEditor): void {
  const {selection} = editor

  if (selection) {
    editor.apply({
      type: 'set_selection',
      properties: selection,
      newProperties: null,
    })
  }
}

function toRange(
  editor: PortableTextSlateEditor,
  target: Range | Point | Path,
): Range {
  if (isRange(target)) {
    return target
  }

  if (isPoint(target)) {
    return {anchor: target, focus: target}
  }

  // Path — create a range spanning the entire node
  const start = editorStart(editor, target)
  const end = editorEnd(editor, target)
  return {anchor: start, focus: end}
}
