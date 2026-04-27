import {isSpan, isTextBlock} from '@portabletext/schema'
import {applyInsertNodeAtPath} from '../internal-utils/apply-insert-node'
import {applySelect, resolveSelection} from '../internal-utils/apply-selection'
import {applySplitNode} from '../internal-utils/apply-split-node'
import {deleteRange} from '../internal-utils/delete-range'
import {isEqualChildren, isEqualMarks} from '../internal-utils/equality'
import {safeStringify} from '../internal-utils/safe-json'
import {setNodeProperties} from '../internal-utils/set-node-properties'
import {toSlateBlock} from '../internal-utils/values'
import {getAncestorTextBlock} from '../node-traversal/get-ancestor-text-block'
import {getEnclosingBlock} from '../node-traversal/get-enclosing-block'
import {getSibling} from '../node-traversal/get-sibling'
import {getSpanNode} from '../node-traversal/get-span-node'
import {getTextBlockNode} from '../node-traversal/get-text-block-node'
import {end as editorEnd} from '../slate/editor/end'
import {pathRef} from '../slate/editor/path-ref'
import {rangeRef} from '../slate/editor/range-ref'
import {start as editorStart} from '../slate/editor/start'
import type {Node} from '../slate/interfaces/node'
import type {InsertOperation} from '../slate/interfaces/operation'
import type {Path} from '../slate/interfaces/path'
import type {Point} from '../slate/interfaces/point'
import type {Range} from '../slate/interfaces/range'
import {parentPath} from '../slate/path/parent-path'
import {pathEquals} from '../slate/path/path-equals'
import {siblingPath} from '../slate/path/sibling-path'
import {pointEquals} from '../slate/point/point-equals'
import {isExpandedRange} from '../slate/range/is-expanded-range'
import {rangeEdges} from '../slate/range/range-edges'
import {rangeEnd} from '../slate/range/range-end'
import {rangeStart} from '../slate/range/range-start'
import type {EditorSelection} from '../types/editor'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {parseBlock} from '../utils/parse-blocks'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {OperationContext, OperationImplementation} from './operation.types'

/**
 * Describes a concrete insertion strategy resolved from the operation's
 * inputs (editor value, current selection, block being inserted, placement).
 */
type InsertTarget =
  | {kind: 'empty-editor'}
  | {kind: 'before'; blockPath: Path}
  | {kind: 'after'; blockPath: Path}
  | {kind: 'replace'; blockPath: Path}
  | {kind: 'split-insert'; blockPath: Path; splitAt: Point}
  | {kind: 'fragment'; at: Point; endBlockPath: Path}
  | {kind: 'delete-then-insert'; range: Range; startBlockPath: Path}

export const insertBlockOperationImplementation: OperationImplementation<
  'insert.block'
> = ({context, operation}) => {
  const parsedBlock = parseBlock({
    block: operation.block,
    context,
    options: {
      normalize: true,
      removeUnusedMarkDefs: true,
      validateFields: true,
    },
  })

  if (!parsedBlock) {
    throw new Error(`Failed to parse block ${safeStringify(operation.block)}`)
  }

  const block = toSlateBlock(parsedBlock, {schemaTypes: context.schema})
  const editor = operation.editor
  // When `placement` is `before` or `after`, the caller has already chosen
  // where the new block should land. Resolving `operation.at` would descend
  // block-level paths to leaves, which `findContainingBlock` then walks back
  // up, losing the caller's intent to anchor at a specific block. We still
  // use `resolveSelection` to detect unresolvable `at` values (referenced
  // block was removed) so we can fall back to the editor selection, which
  // matches the behavior expected by `insert.blocks`-style chained inserts
  // where a previous block in the chain may have been aborted.
  const resolved = operation.at
    ? resolveSelection(editor, operation.at)
    : editor.selection
  const at =
    resolved && operation.at && operation.placement !== 'auto'
      ? operation.at
      : resolved

  const target = resolveTarget({
    editor,
    block,
    at: at ?? undefined,
    placement: operation.placement,
  })

  if (!target) {
    throw new Error(`Unable to insert block ${safeStringify(operation.block)}`)
  }

  dispatchInsert({
    editor,
    context,
    block,
    target,
    select: operation.select ?? 'start',
    selectionAtEntry: editor.selection,
  })
}

// ---------------------------------------------------------------------------
// Phase 1: resolve intent
// ---------------------------------------------------------------------------

/**
 * Resolve the insertion intent into a concrete InsertTarget. Pure: performs
 * no mutations on the editor.
 */
function resolveTarget(args: {
  editor: PortableTextSlateEditor
  block: Node
  at: Range | undefined
  placement: 'auto' | 'before' | 'after'
}): InsertTarget | undefined {
  const {editor, block, at, placement} = args

  if (editor.children.length === 0) {
    return {kind: 'empty-editor'}
  }

  const [startPoint, endPoint] = at
    ? rangeEdges(at, {}, editor)
    : [editorStart(editor, []), editorEnd(editor, [])]

  const startBlockEntry = getEnclosingBlock(editor, startPoint.path)
  const endBlockEntry = getEnclosingBlock(editor, endPoint.path)

  if (!startBlockEntry || !endBlockEntry) {
    return undefined
  }

  const startBlockPath = startBlockEntry.path
  const endBlock = endBlockEntry.node
  const endBlockPath = endBlockEntry.path

  if (placement === 'before') {
    return {kind: 'before', blockPath: startBlockPath}
  }

  if (placement === 'after') {
    return {kind: 'after', blockPath: endBlockPath}
  }

  const schemaContext = {schema: editor.schema}

  if (!at) {
    if (isEmptyTextBlock(schemaContext, endBlock)) {
      return {kind: 'replace', blockPath: endBlockPath}
    }
    return {kind: 'after', blockPath: endBlockPath}
  }

  if (isExpandedRange(at)) {
    return {kind: 'delete-then-insert', range: at, startBlockPath}
  }

  const collapsedPoint = rangeStart(at, editor)

  if (isEmptyTextBlock(schemaContext, endBlock)) {
    return {kind: 'replace', blockPath: endBlockPath}
  }

  const blockIsText = isTextBlock(schemaContext, block)
  const endBlockIsText = isTextBlock(schemaContext, endBlock)

  if (!endBlockIsText) {
    return {kind: 'after', blockPath: endBlockPath}
  }

  const blockStartPoint = editorStart(editor, endBlockPath)
  const blockEndPoint = editorEnd(editor, endBlockPath)
  const atBlockStart = pointEquals(collapsedPoint, blockStartPoint)
  const atBlockEnd = pointEquals(collapsedPoint, blockEndPoint)

  if (blockIsText) {
    return {kind: 'fragment', at: collapsedPoint, endBlockPath}
  }

  if (atBlockStart) {
    return {kind: 'before', blockPath: endBlockPath}
  }

  if (atBlockEnd) {
    return {kind: 'after', blockPath: endBlockPath}
  }

  return {
    kind: 'split-insert',
    blockPath: endBlockPath,
    splitAt: collapsedPoint,
  }
}

// ---------------------------------------------------------------------------
// Phase 2: dispatch to a pseudo-behavior
// ---------------------------------------------------------------------------

function dispatchInsert(args: {
  editor: PortableTextSlateEditor
  context: OperationContext
  block: Node
  target: InsertTarget
  select: 'start' | 'end' | 'none'
  selectionAtEntry: EditorSelection
  wasCrossBlock?: boolean
}): void {
  const {
    editor,
    context,
    block,
    target,
    select,
    selectionAtEntry,
    wasCrossBlock,
  } = args

  switch (target.kind) {
    case 'empty-editor': {
      const insertedPath = insertBlockIntoEmptyEditor(editor, block)
      applyPostInsertSelection(editor, insertedPath, select, selectionAtEntry)
      return
    }

    case 'before': {
      const insertedPath = insertSiblingBlock(
        editor,
        block,
        target.blockPath,
        'before',
      )
      applyPostInsertSelection(editor, insertedPath, select, selectionAtEntry)
      return
    }

    case 'after': {
      const insertedPath = insertSiblingBlock(
        editor,
        block,
        target.blockPath,
        'after',
      )
      applyPostInsertSelection(editor, insertedPath, select, selectionAtEntry)
      return
    }

    case 'replace': {
      const insertedPath = replaceBlock(editor, block, target.blockPath)
      applyPostInsertSelection(editor, insertedPath, select, selectionAtEntry)
      return
    }

    case 'split-insert': {
      const insertedPath = splitBlockAndInsert(
        editor,
        block,
        target.blockPath,
        target.splitAt,
      )
      applyPostInsertSelection(editor, insertedPath, select, selectionAtEntry)
      return
    }

    case 'fragment': {
      mergeTextBlockFragment({
        editor,
        context,
        block,
        at: target.at,
        endBlockPath: target.endBlockPath,
        select,
        wasCrossBlock,
      })
      return
    }

    case 'delete-then-insert': {
      executeDeleteThenInsert({
        editor,
        context,
        block,
        range: target.range,
        select,
        selectionAtEntry,
      })
      return
    }
  }
}

// ---------------------------------------------------------------------------
// Pseudo-behaviors
// ---------------------------------------------------------------------------

/**
 * Insert a block into an editor with no existing children. Returns the path
 * of the inserted block.
 */
function insertBlockIntoEmptyEditor(
  editor: PortableTextSlateEditor,
  block: Node,
): Path {
  applyInsertNodeAtPath(editor, block, [0])
  return [{_key: block._key}]
}

/**
 * Insert a block as a sibling of the block at siblingPath (before or after).
 * Uses a pathRef on the container field path so the returned inserted path
 * is valid at any depth.
 */
function insertSiblingBlock(
  editor: PortableTextSlateEditor,
  block: Node,
  siblingNodePath: Path,
  position: 'before' | 'after',
): Path {
  const siblingPathRef = pathRef(editor, siblingNodePath)

  const operation: InsertOperation = {
    type: 'insert',
    path: siblingNodePath,
    node: block,
    position,
  }
  editor.apply(operation)

  const resolvedSiblingPath = siblingPathRef.unref() ?? siblingNodePath

  return siblingPath(resolvedSiblingPath, operation.node._key)
}

/**
 * Replace the block at targetPath with a new block. Inserts the new block
 * before the existing one and unsets the old one. Returns the path of the
 * inserted block.
 */
function replaceBlock(
  editor: PortableTextSlateEditor,
  block: Node,
  targetPath: Path,
): Path {
  const insertedPath = insertSiblingBlock(editor, block, targetPath, 'before')
  editor.apply({type: 'unset', path: targetPath})
  return insertedPath
}

/**
 * Split a text block at a point and insert a block object between the two
 * halves. Returns the path of the inserted block.
 */
function splitBlockAndInsert(
  editor: PortableTextSlateEditor,
  block: Node,
  blockPath: Path,
  splitAt: Point,
): Path {
  const blockPathRef = pathRef(editor, blockPath, {affinity: 'backward'})

  if (splitAt.offset > 0) {
    const spanEntry = getSpanNode(editor, splitAt.path)
    if (spanEntry && splitAt.offset < spanEntry.node.text.length) {
      applySplitNode(editor, splitAt.path, splitAt.offset)
    }
  }

  const currentBlockPath = blockPathRef.current ?? blockPath
  const blockEntry = getTextBlockNode(editor, currentBlockPath)

  if (blockEntry) {
    const childSegment = splitAt.path[blockPath.length + 1]
    const childIndex = resolveChildIndex(blockEntry.node.children, childSegment)
    const splitAtIndex = splitAt.offset > 0 ? childIndex + 1 : childIndex

    if (splitAtIndex > 0 && splitAtIndex < blockEntry.node.children.length) {
      applySplitNode(editor, currentBlockPath, splitAtIndex)
    }
  }

  const firstHalfPath = blockPathRef.unref() ?? currentBlockPath

  return insertSiblingBlock(editor, block, firstHalfPath, 'after')
}

/**
 * Merge a text block's children into an existing text block at a point.
 * Reassigns colliding keys, unions markDefs, optionally splits the target
 * span, then prepends or inserts the fragment's children. Applies its own
 * post-insert selection because the correct caret position depends on state
 * captured before the insert.
 */
function mergeTextBlockFragment(args: {
  editor: PortableTextSlateEditor
  context: OperationContext
  block: Node
  at: Point
  endBlockPath: Path
  select: 'start' | 'end' | 'none'
  wasCrossBlock?: boolean
}): void {
  const {editor, context, block, at, endBlockPath, select, wasCrossBlock} = args

  const endBlockEntry = getTextBlockNode(editor, endBlockPath)

  if (!endBlockEntry) {
    return
  }

  const endBlock = endBlockEntry.node

  const {adjustedBlock, adjustedMarkDefs} = adjustFragmentKeys({
    context,
    block,
    endBlock,
  })

  setNodeProperties(
    editor,
    {
      markDefs: [...(endBlock.markDefs ?? []), ...(adjustedMarkDefs ?? [])],
    },
    endBlockPath,
  )

  const atPathRef = pathRef(editor, at.path)

  const endBlockStartPoint = editorStart(editor, endBlockPath)
  const atBlockStart = pointEquals(at, endBlockStartPoint)
  const firstInsertedKey = insertFragmentChildren(editor, adjustedBlock, at)

  const resolvedAtPath = atPathRef.unref()

  if (select === 'none') {
    if (wasCrossBlock || !atBlockStart) {
      applySelect(editor, at)
    }
    return
  }

  if (select === 'end') {
    return
  }

  if (select === 'start' && firstInsertedKey && resolvedAtPath) {
    const firstInsertedPath: Path = siblingPath(
      resolvedAtPath,
      firstInsertedKey,
    )
    const startPoint = editorStart(editor, firstInsertedPath)
    applySelect(editor, startPoint)
  }
}

/**
 * Apply the appropriate selection after a block has been inserted at
 * insertedBlockPath. For select === 'none', restores the selection that was
 * active when the operation started.
 */
function applyPostInsertSelection(
  editor: PortableTextSlateEditor,
  insertedBlockPath: Path,
  select: 'start' | 'end' | 'none',
  selectionAtEntry: EditorSelection,
): void {
  if (select === 'none') {
    if (selectionAtEntry) {
      applySelect(editor, selectionAtEntry)
      return
    }

    if (editor.selection) {
      editor.apply({
        type: 'set_selection',
        properties: editor.selection,
        newProperties: null,
      })
    }
    return
  }

  const point =
    select === 'end'
      ? editorEnd(editor, insertedBlockPath)
      : editorStart(editor, insertedBlockPath)

  applySelect(editor, point)
}

// ---------------------------------------------------------------------------
// delete-then-insert: delete the range, re-resolve, recurse into dispatcher
// ---------------------------------------------------------------------------

/**
 * Delete an expanded range, re-resolve the insertion target against the
 * post-delete (collapsed) state, then recurse into the dispatcher. The
 * cross-block status of the original range is threaded through so that the
 * fragment pseudo-behavior can restore the caret correctly.
 */
function executeDeleteThenInsert(args: {
  editor: PortableTextSlateEditor
  context: OperationContext
  block: Node
  range: Range
  select: 'start' | 'end' | 'none'
  selectionAtEntry: EditorSelection
}): void {
  const {editor, context, block, range, select, selectionAtEntry} = args

  const rangeStartPoint = rangeStart(range, editor)
  const rangeEndPoint = rangeEnd(range, editor)

  const startBlockEntry = getEnclosingBlock(editor, rangeStartPoint.path)
  const endBlockEntry = getEnclosingBlock(editor, rangeEndPoint.path)
  const wasCrossBlock =
    startBlockEntry !== undefined &&
    endBlockEntry !== undefined &&
    !pathEquals(startBlockEntry.path, endBlockEntry.path)

  const startBlockPath = startBlockEntry?.path
  const startOfStartBlock = startBlockPath
    ? editorStart(editor, startBlockPath)
    : undefined
  const isAtStartOfBlock = startOfStartBlock
    ? pointEquals(rangeStartPoint, startOfStartBlock)
    : false

  const collapsedRangeRef = rangeRef(editor, range, {affinity: 'inward'})

  deleteRange(editor, range)

  const collapsedRange = collapsedRangeRef.unref() ?? editor.selection
  const collapsedPoint = collapsedRange
    ? rangeStart(collapsedRange, editor)
    : undefined

  if (!collapsedPoint) {
    return
  }

  const resolvedBlock = getAncestorTextBlock(editor, collapsedPoint.path)
  const blockIsText = isTextBlock({schema: editor.schema}, block)

  // For `select: 'none'`, the desired restored selection is the collapsed
  // post-delete range (not the original expanded range). Track it through
  // the subsequent insert so paths/offsets remain valid.
  const postDeleteSelection: EditorSelection =
    select === 'none' ? collapsedRange : selectionAtEntry

  if (blockIsText && resolvedBlock) {
    // Only treat the block as "empty target to replace" when the range was
    // within a single block (i.e. the delete emptied it). Cross-block
    // deletes always merge into a fragment even if the result looks empty
    // at this instant.
    if (!wasCrossBlock && isEmptyTextBlock(context, resolvedBlock.node)) {
      dispatchInsert({
        editor,
        context,
        block,
        target: {kind: 'replace', blockPath: resolvedBlock.path},
        select,
        selectionAtEntry: postDeleteSelection,
      })
      return
    }

    dispatchInsert({
      editor,
      context,
      block,
      target: {
        kind: 'fragment',
        at: collapsedPoint,
        endBlockPath: resolvedBlock.path,
      },
      select,
      selectionAtEntry: postDeleteSelection,
      wasCrossBlock,
    })
    return
  }

  const containingBlockEntry =
    resolvedBlock ?? getEnclosingBlock(editor, collapsedPoint.path)

  if (!containingBlockEntry) {
    return
  }

  const insertedPath = insertSiblingBlock(
    editor,
    block,
    containingBlockEntry.path,
    isAtStartOfBlock ? 'before' : 'after',
  )

  applyPostInsertSelection(editor, insertedPath, select, postDeleteSelection)

  // If inserting an object block next to a text block that is now empty,
  // remove the empty text block.
  if (!blockIsText) {
    removeAdjacentEmptyTextBlock({
      editor,
      context,
      insertedPath,
    })
  }
}

/**
 * After inserting a non-text block, remove the adjacent empty text block
 * if one is left behind.
 */
function removeAdjacentEmptyTextBlock(args: {
  editor: PortableTextSlateEditor
  context: OperationContext
  insertedPath: Path
}): void {
  const {editor, context, insertedPath} = args

  for (const direction of ['next', 'previous'] as const) {
    const sibling = getSibling(editor, insertedPath, direction)
    if (sibling && isEmptyTextBlock(context, sibling.node)) {
      editor.apply({type: 'unset', path: sibling.path})
      return
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a path segment (keyed or numeric) to a child index within a
 * parent's children array. Returns -1 if the segment cannot be resolved.
 */
function resolveChildIndex(
  children: Array<{_key: string}>,
  segment: unknown,
): number {
  if (typeof segment === 'number') {
    return segment
  }
  if (isKeyedSegment(segment)) {
    return children.findIndex((child) => child._key === segment._key)
  }
  return -1
}

/**
 * Reassign keys on spans, inline objects and markDefs that collide with the
 * end block's existing keys. Returns the adjusted block and the adjusted
 * markDefs (to be merged into the end block).
 */
function adjustFragmentKeys(args: {
  context: OperationContext
  block: Node
  endBlock: Node
}): {adjustedBlock: Node; adjustedMarkDefs: Array<{_key: string}> | undefined} {
  const {context, block, endBlock} = args

  if (!isTextBlock({schema: context.schema}, block)) {
    return {adjustedBlock: block, adjustedMarkDefs: undefined}
  }

  if (!isTextBlock({schema: context.schema}, endBlock)) {
    return {adjustedBlock: block, adjustedMarkDefs: block.markDefs}
  }

  const endBlockChildKeys = endBlock.children.map((child) => child._key)
  const endBlockMarkDefsKeys =
    endBlock.markDefs?.map((markDef) => markDef._key) ?? []

  const markDefKeyMap = new Map<string, string>()
  const adjustedMarkDefs = block.markDefs?.map((markDef) => {
    if (endBlockMarkDefsKeys.includes(markDef._key)) {
      const newKey = context.keyGenerator()
      markDefKeyMap.set(markDef._key, newKey)
      return {...markDef, _key: newKey}
    }
    return markDef
  })

  const adjustedChildren = block.children.map((child) => {
    if (isSpan(context, child)) {
      const marks =
        child.marks?.map((mark) => markDefKeyMap.get(mark) ?? mark) ?? []

      if (!isEqualMarks(child.marks, marks)) {
        return {
          ...child,
          _key: endBlockChildKeys.includes(child._key)
            ? context.keyGenerator()
            : child._key,
          marks,
        }
      }
    }

    if (endBlockChildKeys.includes(child._key)) {
      return {...child, _key: context.keyGenerator()}
    }

    return child
  })

  const adjustedBlock = !isEqualChildren(
    block.children,
    adjustedChildren,
    context.schema.span.name,
  )
    ? {...block, children: adjustedChildren}
    : block

  return {adjustedBlock, adjustedMarkDefs}
}

/**
 * Insert a text block's children at a point within another text block.
 * Prepending a single span at offset 0 uses insert_text so React's DOM
 * selection stays valid through deferred normalization.
 */
function insertFragmentChildren(
  editor: PortableTextSlateEditor,
  block: Node,
  at: Point,
): string | undefined {
  if (!isTextBlock({schema: editor.schema}, block)) {
    return undefined
  }

  if (at.offset > 0) {
    const textNodeEntry = getSpanNode(editor, at.path)

    if (textNodeEntry) {
      applySplitNode(editor, at.path, at.offset)
    }
  }

  const parent = parentPath(at.path)
  let firstInsertedKey: string | undefined

  if (at.offset === 0 && block.children.length === 1) {
    const firstChild = block.children[0]!
    const existingEntry = getSpanNode(editor, at.path)

    if (existingEntry && isSpan({schema: editor.schema}, firstChild)) {
      if (firstChild.text.length > 0) {
        editor.apply({
          type: 'insert_text',
          path: at.path,
          offset: 0,
          text: firstChild.text,
        })
      }
      return existingEntry.node._key
    }
  }

  let insertAfterPath = at.path

  for (const child of block.children) {
    const operation: InsertOperation = {
      type: 'insert',
      path: insertAfterPath,
      node: child,
      position:
        at.offset > 0 || child !== block.children[0] ? 'after' : 'before',
    }
    editor.apply(operation)
    insertAfterPath = [...parent, 'children', {_key: operation.node._key}]
    if (firstInsertedKey === undefined) {
      firstInsertedKey = operation.node._key
    }
  }

  return firstInsertedKey
}
