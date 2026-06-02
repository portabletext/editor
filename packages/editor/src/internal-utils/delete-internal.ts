import {pointRef} from '../engine/editor/point-ref'
import type {Path} from '../engine/interfaces/path'
import type {Point} from '../engine/interfaces/point'
import type {Range} from '../engine/interfaces/range'
import {commonPath} from '../engine/path/common-path'
import {parentPath} from '../engine/path/parent-path'
import {pathEquals} from '../engine/path/path-equals'
import {rangeEdges} from '../engine/range/range-edges'
import type {TextUnit} from '../engine/types/types'
import {getEnclosingContainer} from '../schema/get-enclosing-container'
import {resolveContainerByPath} from '../schema/resolve-container-by-path'
import {getChildren} from '../traversal/get-children'
import {getEnclosingBlock} from '../traversal/get-enclosing-block'
import {getFirstChild} from '../traversal/get-first-child'
import {getNode} from '../traversal/get-node'
import {getSibling} from '../traversal/get-sibling'
import {getSpan} from '../traversal/get-span'
import {getTextBlock} from '../traversal/get-text-block'
import {isLeafObject} from '../traversal/is-leaf-object'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {applyMergeNode} from './apply-merge-node'
import {createPlaceholderBlock} from './create-placeholder-block'
import {getFullyCoveredContainers} from './get-fully-covered-container'
import {setNodeProperties} from './set-node-properties'

/**
 * What to do with the editor selection once the delete completes.
 *
 * - `'collapse-to-start'` collapses selection to the start of the deleted
 *   range. The start point is tracked across the delete so it survives any
 *   nodes that get unset along the way.
 * - `'preserve'` leaves selection alone, for callers that update it
 *   themselves (e.g. operations that set their own post-delete cursor).
 */
export type SelectionMode = 'collapse-to-start' | 'preserve'

/**
 * Indic scripts whose grapheme clusters span multiple code points. Backward
 * character delete on these scripts removes one code point at a time instead
 * of the entire cluster.
 */
const COMPOUND_SCRIPT_REGEX =
  /[\u0980-\u09FF\u0E00-\u0E7F\u1000-\u109F\u0900-\u097F\u1780-\u17FF\u0D00-\u0D7F\u0B00-\u0B7F\u0A00-\u0A7F\u0B80-\u0BFF\u0C00-\u0C7F]+/

export interface ApplyDeleteOptions {
  /** Return the removed text. Used for compound-grapheme handling. */
  capture: boolean
  /** `true` if the range was produced by expanding a collapsed cursor. */
  collapsedInput: boolean
  /** `true` for backward delete (Backspace), `false` for forward (Delete). */
  reverse: boolean
  /** The unit the original input was expanded by. */
  unit: TextUnit
  selection: SelectionMode
  removeEmptyStartBlock: boolean
}

/**
 * Apply a resolved delete: mutate the tree, update selection, and reinsert
 * code points for compound-script backward character delete.
 *
 * The range is assumed to be expanded and well-formed (the user-facing entry
 * points handle resolution). Selection is tracked across the mutation through
 * point refs at both endpoints so that an unset start block falls back to the
 * surviving end block.
 */
export function applyDelete(
  editor: PortableTextEditorEngine,
  range: Range,
  options: ApplyDeleteOptions,
): void {
  const {
    capture,
    collapsedInput,
    reverse,
    unit,
    selection: mode,
    removeEmptyStartBlock,
  } = options

  const startRef =
    mode === 'collapse-to-start'
      ? pointRef(editor, range.anchor, {affinity: 'forward'})
      : null
  const endRef =
    mode === 'collapse-to-start'
      ? pointRef(editor, range.focus, {affinity: 'backward'})
      : null

  const removedText = mutateRange(editor, range, {
    capture,
    removeEmptyStartBlock,
  })

  if (mode === 'collapse-to-start') {
    const adjusted = startRef?.unref() ?? endRef?.unref() ?? null
    if (adjusted) {
      editor.select(adjusted)
    }
  } else {
    startRef?.unref()
    endRef?.unref()
  }

  if (
    reverse &&
    unit === 'character' &&
    collapsedInput &&
    removedText &&
    removedText.length > 1 &&
    COMPOUND_SCRIPT_REGEX.test(removedText)
  ) {
    const reinsert = removedText.slice(0, removedText.length - 1)
    if (editor.snapshot.context.selection) {
      const {path, offset} = editor.snapshot.context.selection.anchor
      editor.apply({type: 'insert_text', path, offset, text: reinsert})
    }
  }
}

interface MutateOptions {
  capture: boolean
  removeEmptyStartBlock: boolean
}

/**
 * Classify the resolved range and dispatch to the appropriate mutator:
 *
 * - Both endpoints inside the same block: trim text, possibly across spans.
 * - Endpoints in sibling blocks under the same parent: trim each block's
 *   partial content and merge the end block into the start.
 * - Endpoints under different parents (e.g. one inside an editable
 *   container): trim each end's partial content and leave the two block
 *   shells alone (no cross-parent merge).
 */
function mutateRange(
  editor: PortableTextEditorEngine,
  range: Range,
  options: MutateOptions,
): string | null {
  const {capture, removeEmptyStartBlock} = options

  const [start, end] = rangeEdges(range, editor.snapshot.context)

  const startBlock = getEnclosingBlock(editor.snapshot, start.path)
  const endBlock = getEnclosingBlock(editor.snapshot, end.path)

  if (!startBlock || !endBlock) {
    return null
  }

  if (pathEquals(startBlock.path, endBlock.path)) {
    return deleteSameBlockRange(editor, start, end, capture)
  }

  const sameParent = pathEquals(
    parentPath(startBlock.path),
    parentPath(endBlock.path),
  )

  if (sameParent) {
    deleteSameParentCrossBlockRange(
      editor,
      startBlock.path,
      endBlock.path,
      start,
      end,
      removeEmptyStartBlock,
    )
    return null
  }

  deleteCrossParentRange(editor, startBlock.path, endBlock.path, start, end)
  return null
}

/**
 * Delete a range whose endpoints share the same parent block. Handles the
 * three sub-cases: same span (just trim text), different spans (trim and
 * splice), and either endpoint inside a void inline object (unset).
 */
function deleteSameBlockRange(
  editor: PortableTextEditorEngine,
  start: Point,
  end: Point,
  capture: boolean,
): string | null {
  if (pathEquals(start.path, end.path)) {
    return removeTextRange(
      editor,
      start.path,
      start.offset,
      end.offset,
      capture,
    )
  }

  const startEntry = getNode(editor.snapshot, start.path)
  if (
    startEntry &&
    isLeafObject(editor.snapshot, startEntry.node, start.path)
  ) {
    editor.apply({type: 'unset', path: start.path})
    return null
  }

  const removed = removeTextFromOffset(
    editor,
    start.path,
    start.offset,
    capture,
  )
  removeChildrenBetween(editor, start.path, end.path)

  const adjustedEnd = getSibling(editor.snapshot, start.path, {
    direction: 'next',
  })
  if (!adjustedEnd) {
    return removed
  }

  if (isLeafObject(editor.snapshot, adjustedEnd.node, adjustedEnd.path)) {
    editor.apply({type: 'unset', path: adjustedEnd.path})
    return removed
  }

  removeTextUpToOffset(editor, adjustedEnd.path, end.offset)
  return removed
}

/**
 * Delete a range that crosses block boundaries within the same parent.
 * Trims partial content from the start and end blocks, unsets any blocks
 * fully inside the range, and merges the end block into the start (unless
 * either end is a void block, which is removed atomically).
 */
function deleteSameParentCrossBlockRange(
  editor: PortableTextEditorEngine,
  startBlockPath: Path,
  endBlockPath: Path,
  start: Point,
  end: Point,
  removeEmptyStartBlock: boolean,
): void {
  const startBlockNode = getNode(editor.snapshot, startBlockPath)
  const endBlockNode = getNode(editor.snapshot, endBlockPath)
  const startIsVoid =
    startBlockNode != null &&
    isLeafObject(editor.snapshot, startBlockNode.node, startBlockPath)
  const endIsVoid =
    endBlockNode != null &&
    isLeafObject(editor.snapshot, endBlockNode.node, endBlockPath)

  // Trim the start block's tail (unless start is void or the range begins
  // at the block boundary).
  if (!startIsVoid) {
    if (pathEquals(start.path, startBlockPath)) {
      // Block-level start (e.g. `[{_key: blockKey}]:0`): the range begins
      // at the block boundary, so every child should be cleared.
      removeAllChildren(editor, startBlockPath)
    } else {
      removeTextFromOffset(editor, start.path, start.offset, false)
      removeTrailingChildren(editor, start.path)
    }
  }

  // Remove every block strictly between start and end.
  removeBlocksBetween(editor, startBlockPath, endBlockPath)

  // Both endpoints void: unset both shells, nothing to merge.
  if (startIsVoid && endIsVoid) {
    removeNodeAt(editor, endBlockPath)
    removeNodeAt(editor, startBlockPath)
    return
  }

  // Start void, end text: unset the start shell and trim the end block in
  // place. No merge because start no longer exists.
  if (startIsVoid) {
    if (!pathEquals(end.path, endBlockPath)) {
      removeLeadingChildrenOf(editor, endBlockPath, end.path)
      const firstChild = getFirstChild(editor.snapshot, endBlockPath)
      if (firstChild) {
        removeTextUpToOffset(editor, firstChild.path, end.offset)
      }
    }
    removeNodeAt(editor, startBlockPath)
    return
  }

  // Start text, end void: unset the end shell. Preserve the start block's
  // shell at the user's chosen boundary.
  if (endIsVoid) {
    removeNodeAt(editor, endBlockPath)
    return
  }

  // Both text: trim the end block, then merge it into the start.
  const adjustedEndBlock = getSibling(editor.snapshot, startBlockPath, {
    direction: 'next',
  })
  const adjustedEndBlockPath = adjustedEndBlock?.path ?? startBlockPath

  if (!pathEquals(end.path, endBlockPath)) {
    removeLeadingChildrenOf(editor, adjustedEndBlockPath, end.path)
    const firstChild = getFirstChild(editor.snapshot, adjustedEndBlockPath)
    if (firstChild) {
      removeTextUpToOffset(editor, firstChild.path, end.offset)
    }
  }

  mergeBlock(
    editor,
    startBlockPath,
    adjustedEndBlockPath,
    removeEmptyStartBlock,
  )
}

/**
 * Delete a range whose endpoints live under different parents (e.g. one
 * inside an editable container, one outside). Trims partial content at
 * each endpoint, removes everything between, and leaves the two block
 * shells in place. No merge happens, since the shells aren't siblings.
 *
 * The "between" content is everything covered by the range that isn't
 * the start or end blocks themselves: trailing siblings of the start
 * block at every level up to the lowest common ancestor, leading
 * siblings of the end block at every level down from the LCA, and any
 * blocks strictly between the two branches at the LCA itself.
 */
function deleteCrossParentRange(
  editor: PortableTextEditorEngine,
  startBlockPath: Path,
  endBlockPath: Path,
  start: Point,
  end: Point,
): void {
  // Compute fully-covered containers up front, before any trim mutates
  // the leaves. After trimming, container endpoints shrink and the
  // original range would falsely match shells that aren't fully covered.
  const fullyCovered = getFullyCoveredContainers(editor, {
    anchor: start,
    focus: end,
  })

  const lca = commonPath(startBlockPath, endBlockPath)
  const startBranchRoot = startBlockPath.slice(0, lca.length + 1)
  const endBranchRoot = endBlockPath.slice(0, lca.length + 1)

  // 1. Trim the start block: remove text after the offset and any
  //    trailing children inside the same block.
  if (!pathEquals(start.path, startBlockPath)) {
    removeTextFromOffset(editor, start.path, start.offset, false)
    removeTrailingChildren(editor, start.path)
  }

  // 2. Walk up the start branch. At every level above the start block
  //    and below the start branch root, drop all trailing siblings.
  //    Trailing siblings of the start branch root itself are handled
  //    by `removeChildrenBetween` below. When the level's parent is a
  //    structural container (its field doesn't accept text-block), the
  //    siblings are structural shells (e.g. table cells in a row);
  //    clear their contents instead of removing the shells themselves.
  let startLevel = startBlockPath
  while (!pathEquals(startLevel, startBranchRoot)) {
    if (parentAcceptsTextBlock(editor, startLevel)) {
      removeTrailingChildren(editor, startLevel)
    } else {
      clearTrailingSiblings(editor, startLevel)
    }
    startLevel = parentPath(startLevel)
  }

  // 3. Drop blocks strictly between the two branches at the LCA.
  //    When the LCA's field doesn't accept text-block, the children
  //    between are structural to their parent's shape (e.g. table
  //    cells in a row). Preserve each shell and clear its contents
  //    instead of unsetting it.
  const lcaContainer = getEnclosingContainer(editor.snapshot, startBranchRoot)
  const lcaAcceptsTextBlock = lcaContainer
    ? lcaContainer.of.some(
        (member) => member.type === editor.snapshot.context.schema.block.name,
      )
    : true

  if (lcaAcceptsTextBlock) {
    removeChildrenBetween(editor, startBranchRoot, endBranchRoot)
  } else {
    let cursor = getSibling(editor.snapshot, startBranchRoot, {
      direction: 'next',
    })
    while (cursor && !pathEquals(cursor.path, endBranchRoot)) {
      const cursorPath = cursor.path
      clearContainerContents(editor, cursorPath)
      cursor = getSibling(editor.snapshot, cursorPath, {direction: 'next'})
    }
  }

  // 4. Walk up the end branch. At every level above the end block and
  //    below the end branch root, drop all preceding siblings.
  //    Preceding siblings of the end branch root itself are handled
  //    by `removeChildrenBetween` above. When the level's parent is a
  //    structural container, clear sibling contents instead of
  //    removing the shells.
  let endLevel = endBlockPath
  while (!pathEquals(endLevel, endBranchRoot)) {
    if (parentAcceptsTextBlock(editor, endLevel)) {
      removePrecedingSiblings(editor, endLevel)
    } else {
      clearPrecedingSiblings(editor, endLevel)
    }
    endLevel = parentPath(endLevel)
  }

  // 5. Trim the end block: remove leading children and any text in
  //    the first surviving child that comes before the end offset.
  if (!pathEquals(end.path, endBlockPath)) {
    removeLeadingChildrenOf(editor, endBlockPath, end.path)
    const firstChild = getFirstChild(editor.snapshot, endBlockPath)
    if (firstChild) {
      removeTextUpToOffset(editor, firstChild.path, end.offset)
    }
  }

  // 6. Unset every container the range fully covers. The trim and
  //    walk-up steps above modified content inside fully-covered
  //    shells; that's harmless because the shells get unset here.
  //    Unset the end side first so the start path stays valid.
  if (
    fullyCovered.start &&
    fullyCovered.end &&
    pathEquals(fullyCovered.start, fullyCovered.end)
  ) {
    editor.apply({type: 'unset', path: fullyCovered.start})
    return
  }
  if (fullyCovered.end) {
    editor.apply({type: 'unset', path: fullyCovered.end})
  }
  if (fullyCovered.start) {
    editor.apply({type: 'unset', path: fullyCovered.start})
  }
}

/** Remove text in `[startOffset, endOffset)` from the span at `path`. */
function removeTextRange(
  editor: PortableTextEditorEngine,
  path: Path,
  startOffset: number,
  endOffset: number,
  capture: boolean,
): string | null {
  const span = getSpan(editor.snapshot, path)
  if (!span) {
    return null
  }
  const text = span.node.text.slice(startOffset, endOffset)
  if (text.length === 0) {
    return null
  }
  editor.apply({type: 'remove_text', path, offset: startOffset, text})
  return capture ? text : null
}

/** Remove text from `offset` to the end of the span at `path`. */
function removeTextFromOffset(
  editor: PortableTextEditorEngine,
  path: Path,
  offset: number,
  capture: boolean,
): string | null {
  const span = getSpan(editor.snapshot, path)
  if (!span || offset >= span.node.text.length) {
    return null
  }
  const text = span.node.text.slice(offset)
  editor.apply({type: 'remove_text', path, offset, text})
  return capture ? text : null
}

/** Remove text from offset 0 up to (but not including) `offset`. */
function removeTextUpToOffset(
  editor: PortableTextEditorEngine,
  path: Path,
  offset: number,
): void {
  if (offset <= 0) {
    return
  }
  const span = getSpan(editor.snapshot, path)
  if (!span) {
    return
  }
  editor.apply({
    type: 'remove_text',
    path,
    offset: 0,
    text: span.node.text.slice(0, offset),
  })
}

/**
 * Remove every sibling strictly between `startChildPath` and
 * `endChildPath`. Both paths must share the same parent.
 */
function removeChildrenBetween(
  editor: PortableTextEditorEngine,
  startChildPath: Path,
  endChildPath: Path,
): void {
  let cursor = getSibling(editor.snapshot, startChildPath, {direction: 'next'})
  while (cursor && !pathEquals(cursor.path, endChildPath)) {
    removeNodeAt(editor, cursor.path)
    cursor = getSibling(editor.snapshot, startChildPath, {direction: 'next'})
  }
}

/**
 * Empty out a structurally-preserved container at `containerPath`.
 *
 * Used by cross-parent range delete when a fully-covered container
 * sits at an LCA whose field doesn't accept text-block (e.g. a table
 * cell whose row only holds cells). The shell stays so the parent's
 * shape is preserved; the contents are cleared.
 *
 * Walks the container's child-array field. If the field accepts text
 * blocks, it removes everything and inserts a single placeholder text
 * block. Otherwise the children are themselves structural and the
 * function recurses into each.
 */
function clearContainerContents(
  editor: PortableTextEditorEngine,
  containerPath: Path,
): void {
  const node = getNode(editor.snapshot, containerPath)?.node
  if (!node) {
    return
  }

  const container = resolveContainerByPath(
    {
      containers: editor.containers,
      schema: editor.snapshot.context.schema,
      value: editor.snapshot.context.value,
    },
    containerPath,
    node,
  )
  if (!container || !('container' in container)) {
    return
  }

  const fieldName = container.field.name
  const fieldAcceptsTextBlock = container.field.of.some(
    (member) => member.type === editor.snapshot.context.schema.block.name,
  )

  if (fieldAcceptsTextBlock) {
    let firstChild = getFirstChild(editor.snapshot, containerPath)
    while (firstChild) {
      removeNodeAt(editor, firstChild.path)
      firstChild = getFirstChild(editor.snapshot, containerPath)
    }
    const placeholderPath: Path = [...containerPath, fieldName, 0]
    editor.apply({
      type: 'insert',
      path: placeholderPath,
      node: createPlaceholderBlock(editor.snapshot, placeholderPath),
      position: 'before',
    })
    return
  }

  for (const child of getChildren(editor.snapshot, containerPath)) {
    clearContainerContents(editor, child.path)
  }
}

/** Remove every sibling that comes after `startChildPath`. */
function removeTrailingChildren(
  editor: PortableTextEditorEngine,
  startChildPath: Path,
): void {
  let cursor = getSibling(editor.snapshot, startChildPath, {direction: 'next'})
  while (cursor) {
    removeNodeAt(editor, cursor.path)
    cursor = getSibling(editor.snapshot, startChildPath, {direction: 'next'})
  }
}

/** Clear contents of every sibling that comes after `startChildPath`. */
function clearTrailingSiblings(
  editor: PortableTextEditorEngine,
  startChildPath: Path,
): void {
  let cursor = getSibling(editor.snapshot, startChildPath, {direction: 'next'})
  while (cursor) {
    const cursorPath = cursor.path
    clearContainerContents(editor, cursorPath)
    cursor = getSibling(editor.snapshot, cursorPath, {direction: 'next'})
  }
}

/** Remove every sibling that comes before `startChildPath`. */
function removePrecedingSiblings(
  editor: PortableTextEditorEngine,
  startChildPath: Path,
): void {
  let cursor = getSibling(editor.snapshot, startChildPath, {
    direction: 'previous',
  })
  while (cursor) {
    removeNodeAt(editor, cursor.path)
    cursor = getSibling(editor.snapshot, startChildPath, {
      direction: 'previous',
    })
  }
}

/** Clear contents of every sibling that comes before `startChildPath`. */
function clearPrecedingSiblings(
  editor: PortableTextEditorEngine,
  startChildPath: Path,
): void {
  let cursor = getSibling(editor.snapshot, startChildPath, {
    direction: 'previous',
  })
  while (cursor) {
    const cursorPath = cursor.path
    clearContainerContents(editor, cursorPath)
    cursor = getSibling(editor.snapshot, cursorPath, {direction: 'previous'})
  }
}

/**
 * True when the path's parent is a registered editable container whose
 * field accepts text-block. False when the parent is structural (e.g. a
 * row whose `cells` field only accepts cells) or when the path is at
 * root level.
 */
function parentAcceptsTextBlock(
  editor: PortableTextEditorEngine,
  path: Path,
): boolean {
  const enclosing = getEnclosingContainer(editor.snapshot, path)
  if (!enclosing) {
    return true
  }
  return enclosing.of.some(
    (member) => member.type === editor.snapshot.context.schema.block.name,
  )
}

/**
 * Remove every child of the block at `blockPath`. Used when a delete range
 * starts at the block boundary itself (block-level path with offset 0), so
 * the entire block content is consumed.
 */
function removeAllChildren(
  editor: PortableTextEditorEngine,
  blockPath: Path,
): void {
  let firstChild = getFirstChild(editor.snapshot, blockPath)
  while (firstChild) {
    removeNodeAt(editor, firstChild.path)
    firstChild = getFirstChild(editor.snapshot, blockPath)
  }
}

/**
 * Remove leading children from `blockPath` until `endChildPath` is the
 * first child.
 */
function removeLeadingChildrenOf(
  editor: PortableTextEditorEngine,
  blockPath: Path,
  endChildPath: Path,
): void {
  const endKey = (endChildPath.at(-1) as {_key?: string} | undefined)?._key
  if (!endKey) {
    return
  }
  let firstChild = getFirstChild(editor.snapshot, blockPath)
  while (
    firstChild &&
    (firstChild.path.at(-1) as {_key?: string} | undefined)?._key !== endKey
  ) {
    removeNodeAt(editor, firstChild.path)
    firstChild = getFirstChild(editor.snapshot, blockPath)
  }
}

/**
 * Remove every sibling block strictly between `startBlockPath` and
 * `endBlockPath`. Both paths must share the same parent.
 */
function removeBlocksBetween(
  editor: PortableTextEditorEngine,
  startBlockPath: Path,
  endBlockPath: Path,
): void {
  let cursor = getSibling(editor.snapshot, startBlockPath, {direction: 'next'})
  while (cursor && !pathEquals(cursor.path, endBlockPath)) {
    removeNodeAt(editor, cursor.path)
    cursor = getSibling(editor.snapshot, startBlockPath, {direction: 'next'})
  }
}

/**
 * Merge `endBlockPath` into `startBlockPath`, carrying over any new
 * `markDefs`. When `removeEmptyStartBlock` is set and the start block has
 * no content left, the start block is removed instead so the end block's
 * formatting (style, listItem) survives.
 */
function mergeBlock(
  editor: PortableTextEditorEngine,
  startBlockPath: Path,
  endBlockPath: Path,
  removeEmptyStartBlock: boolean,
): void {
  if (pathEquals(startBlockPath, endBlockPath)) {
    return
  }
  const startBlock = getTextBlock(editor.snapshot, startBlockPath)
  const endBlock = getTextBlock(editor.snapshot, endBlockPath)
  if (!startBlock || !endBlock) {
    return
  }

  if (
    removeEmptyStartBlock &&
    isEmptyTextBlock({schema: editor.snapshot.context.schema}, startBlock.node)
  ) {
    // If the end block also ends up empty, the range covered both blocks
    // completely. Drop the end block so the start block's formatting wins on
    // the remaining empty block. Otherwise drop the empty start so the end
    // block's content survives.
    if (
      isEmptyTextBlock({schema: editor.snapshot.context.schema}, endBlock.node)
    ) {
      removeNodeAt(editor, endBlockPath)
      return
    }
    removeNodeAt(editor, startBlockPath)
    return
  }

  const endMarkDefs = endBlock.node.markDefs
  if (Array.isArray(endMarkDefs) && endMarkDefs.length > 0) {
    const oldDefs = startBlock.node.markDefs ?? []
    const newMarkDefs = [
      ...new Map(
        [...oldDefs, ...endMarkDefs].map((def) => [def._key, def]),
      ).values(),
    ]
    setNodeProperties(editor, {markDefs: newMarkDefs}, startBlockPath)
  }
  applyMergeNode(editor, endBlockPath, startBlock.node.children.length)
}

function removeNodeAt(editor: PortableTextEditorEngine, path: Path): void {
  if (!getNode(editor.snapshot, path)) {
    return
  }
  editor.apply({type: 'unset', path})
}
