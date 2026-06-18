import {isSpan, isTextBlock} from '@portabletext/schema'
import {end as editorEnd} from '../engine/editor/end'
import {start as editorStart} from '../engine/editor/start'
import type {Path} from '../engine/interfaces/path'
import type {Point} from '../engine/interfaces/point'
import type {Range} from '../engine/interfaces/range'
import {isPoint} from '../engine/point/is-point'
import {pointEquals} from '../engine/point/point-equals'
import {isRange} from '../engine/range/is-range'
import {isEditableContainer} from '../schema/is-editable-container'
import {getChildren} from '../traversal/get-children'
import {getLeaf} from '../traversal/get-leaf'
import {getNode} from '../traversal/get-node'
import {isBlock} from '../traversal/is-block'
import type {EditorSelection} from '../types/editor'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {blockOffsetToSpanSelectionPoint} from '../utils/util.block-offset'
import {isEqualSelectionPoints} from '../utils/util.is-equal-selection-points'
import {getBlockKeyFromSelectionPoint} from '../utils/util.selection-point'

type ResolveSelectionEditor = Pick<PortableTextEditorEngine, 'snapshot'>

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
  options?: {selectContainerAsBlockObject?: boolean},
): Range | null {
  if (!selection) {
    return null
  }

  const holdContainers = options?.selectContainerAsBlockObject ?? false

  if (isEqualSelectionPoints(selection.anchor, selection.focus)) {
    const anchorPoint = resolveSelectionPoint(
      editor,
      selection.anchor,
      selection.backward ? 'backward' : 'forward',
      holdContainers,
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
    holdContainers,
  )
  const focusPoint = resolveSelectionPoint(
    editor,
    selection.focus,
    selection.backward ? 'backward' : 'forward',
    holdContainers,
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
  holdContainers: boolean,
):
  | {
      path: Path
      offset: number
    }
  | undefined {
  const snapshot = {
    context: {
      schema: editor.snapshot.context.schema,
      containers: editor.snapshot.context.containers,
      value: editor.snapshot.context.value,
    },
    blockIndexMap: editor.snapshot.blockIndexMap,
  }

  const entry = getNode(snapshot, selectionPoint.path)

  if (entry) {
    const children = getChildren(snapshot, entry.path)

    // Leaf node (span, inline object, block object). Clamp offset.
    if (children.length === 0) {
      return {
        path: entry.path,
        offset: isSpan({schema: editor.snapshot.context.schema}, entry.node)
          ? Math.min(entry.node.text.length, selectionPoint.offset)
          : 0,
      }
    }

    // Text block with a block-level offset (no child key in path).
    // Resolve the offset to a specific span position. The `isBlock` predicate
    // answers "is this path AT a block (as opposed to inside one)" at any
    // depth, regardless of the parent field name.
    const isBlockLevelPath = isBlock(snapshot, selectionPoint.path)

    if (
      isTextBlock({schema: editor.snapshot.context.schema}, entry.node) &&
      isBlockLevelPath
    ) {
      const spanPoint = blockOffsetToSpanSelectionPoint({
        snapshot,
        blockOffset: {
          path: entry.path,
          offset: selectionPoint.offset,
        },
        direction,
      })

      if (spanPoint) {
        return spanPoint
      }
    }

    // When selecting (not resolving an operation's `at`), a collapsed point
    // on a container selects the container as a block-object, so hold it at
    // its own path rather than descending into the first leaf. Operations
    // (insert, delete, annotate) keep descending into the container.
    if (
      holdContainers &&
      isEditableContainer(snapshot, entry.node, entry.path)
    ) {
      return {path: entry.path, offset: 0}
    }

    // Non-leaf, non-text-block (container or text block without offset).
    // Descend to the nearest leaf.
    const leaf = getLeaf(snapshot, entry.path, {
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

  const blockEntry = getNode(snapshot, [{_key: blockKey}])

  if (!blockEntry) {
    return undefined
  }

  const leaf = getLeaf(snapshot, blockEntry.path, {edge: 'start'})

  return leaf
    ? {path: leaf.path, offset: 0}
    : {path: blockEntry.path, offset: 0}
}

/**
 * Set the editor selection to the given target.
 */
export function applySelect(
  editor: PortableTextEditorEngine,
  target: Range | Point | Path,
): void {
  const range = toRange(editor, target)
  const selection = editor.snapshot.context.selection

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
        type: 'set.selection',
        properties: oldProps,
        newProperties: newProps,
      })
    }
  } else {
    editor.apply({
      type: 'set.selection',
      properties: null,
      newProperties: range,
    })
  }
}

/**
 * Clear the editor selection.
 */
export function applyDeselect(editor: PortableTextEditorEngine): void {
  const selection = editor.snapshot.context.selection

  if (selection) {
    editor.apply({
      type: 'set.selection',
      properties: selection,
      newProperties: null,
    })
  }
}

function toRange(
  editor: PortableTextEditorEngine,
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
