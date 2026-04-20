import {isSpan, isTextBlock} from '@portabletext/schema'
import {applyInsertNodeAtPath} from '../internal-utils/apply-insert-node'
import {applyMergeNode} from '../internal-utils/apply-merge-node'
import {applySelect, resolveSelection} from '../internal-utils/apply-selection'
import {applySplitNode} from '../internal-utils/apply-split-node'
import {isEqualChildren, isEqualMarks} from '../internal-utils/equality'
import {safeStringify} from '../internal-utils/safe-json'
import {setNodeProperties} from '../internal-utils/set-node-properties'
import {toSlateBlock} from '../internal-utils/values'
import {getAncestorTextBlock} from '../node-traversal/get-ancestor-text-block'
import {getChildren} from '../node-traversal/get-children'
import {getNode} from '../node-traversal/get-node'
import {getSibling} from '../node-traversal/get-sibling'
import {getSpanNode} from '../node-traversal/get-span-node'
import {getTextBlockNode} from '../node-traversal/get-text-block-node'
import {isBlock} from '../node-traversal/is-block'
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
  const at = operation.at
    ? resolveSelection(editor, operation.at)
    : editor.selection

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

  const startBlockEntry = findContainingBlock(editor, startPoint.path)
  const endBlockEntry = findContainingBlock(editor, endPoint.path)

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

/**
 * Find the closest ancestor block that contains the given point path. Walks
 * up prefix-by-prefix (deepest first) so it works at any depth.
 */
function findContainingBlock(
  editor: PortableTextSlateEditor,
  pointPath: Path,
): {node: Node; path: Path} | undefined {
  for (let length = pointPath.length; length >= 1; length--) {
    const candidatePath = pointPath.slice(0, length)
    if (typeof candidatePath[candidatePath.length - 1] === 'string') {
      continue
    }
    const entry = getNode(editor, candidatePath)
    if (entry && isBlock(editor, candidatePath)) {
      return entry
    }
  }
  return undefined
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
    const firstInsertedPath: Path = [
      ...parentPath(resolvedAtPath),
      'children',
      {_key: firstInsertedKey},
    ]
    const startPoint = editorStart(editor, firstInsertedPath)
    applySelect(editor, startPoint)
  }
}

/**
 * Delete the contents of an expanded range. Handles same-block and
 * cross-block ranges. Leaves the editor selection collapsed at the range
 * start.
 */
function deleteRange(editor: PortableTextSlateEditor, range: Range): void {
  const [start, end] = rangeEdges(range, {}, editor)

  const startBlock = findContainingBlock(editor, start.path)
  const endBlock = findContainingBlock(editor, end.path)

  if (!startBlock || !endBlock) {
    return
  }

  if (pathEquals(startBlock.path, endBlock.path)) {
    deleteSameBlockRange(editor, start, end, startBlock.path)
  } else {
    deleteCrossBlockRange(editor, start, end, startBlock.path, endBlock.path)
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

  const startBlockEntry = findContainingBlock(editor, rangeStartPoint.path)
  const endBlockEntry = findContainingBlock(editor, rangeEndPoint.path)
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
    resolvedBlock ?? findContainingBlock(editor, collapsedPoint.path)

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

// ---------------------------------------------------------------------------
// Range-delete helpers (depth-2 assumptions; kept as-is, out of scope for
// this refactor).
// ---------------------------------------------------------------------------

function deleteSameBlockRange(
  editor: PortableTextSlateEditor,
  start: Point,
  end: Point,
  blockPath: Path,
) {
  if (pathEquals(start.path, end.path)) {
    const textEntry = getSpanNode(editor, start.path)
    if (!textEntry) {
      return
    }
    const textToRemove = textEntry.node.text.slice(start.offset, end.offset)
    editor.apply({
      type: 'remove_text',
      path: start.path,
      offset: start.offset,
      text: textToRemove,
    })
    return
  }

  const startNodeEntry = getSpanNode(editor, start.path)
  if (startNodeEntry && start.offset < startNodeEntry.node.text.length) {
    const textToRemove = startNodeEntry.node.text.slice(start.offset)
    editor.apply({
      type: 'remove_text',
      path: start.path,
      offset: start.offset,
      text: textToRemove,
    })
  }

  const blockEntry = getTextBlockNode(editor, blockPath)
  if (blockEntry) {
    const startChildIndex = resolveChildIndex(
      blockEntry.node.children,
      start.path.at(-1)!,
    )
    const endChildIndex = resolveChildIndex(
      blockEntry.node.children,
      end.path.at(-1)!,
    )
    for (let i = endChildIndex - 1; i > startChildIndex; i--) {
      removeNodeAt(editor, [
        ...blockPath,
        'children',
        {_key: blockEntry.node.children[i]!._key},
      ])
    }
  }

  const endNodeSibling = getSibling(editor, start.path, 'next')
  const newEndPath: Path = endNodeSibling ? endNodeSibling.path : start.path
  const endNodeEntry = getSpanNode(editor, newEndPath)
  if (endNodeEntry && end.offset > 0) {
    const textToRemove = endNodeEntry.node.text.slice(0, end.offset)
    editor.apply({
      type: 'remove_text',
      path: newEndPath,
      offset: 0,
      text: textToRemove,
    })
  }

  const startNodeAfterEntry = getSpanNode(editor, start.path)
  const endNodeAfterEntry = getSpanNode(editor, newEndPath)
  if (startNodeAfterEntry && endNodeAfterEntry) {
    applyMergeNode(editor, newEndPath, startNodeAfterEntry.node.text.length)
  }
}

function deleteCrossBlockRange(
  editor: PortableTextSlateEditor,
  start: Point,
  end: Point,
  startBlockPath: Path,
  endBlockPath: Path,
) {
  if (start.path.length > 1) {
    const startNodeEntry = getSpanNode(editor, start.path)
    if (startNodeEntry && start.offset < startNodeEntry.node.text.length) {
      const textToRemove = startNodeEntry.node.text.slice(start.offset)
      editor.apply({
        type: 'remove_text',
        path: start.path,
        offset: start.offset,
        text: textToRemove,
      })
    }

    const startBlockEntry = getTextBlockNode(editor, startBlockPath)
    if (startBlockEntry) {
      const startChildIndex = resolveChildIndex(
        startBlockEntry.node.children,
        start.path.at(-1)!,
      )
      for (
        let i = startBlockEntry.node.children.length - 1;
        i > startChildIndex;
        i--
      ) {
        removeNodeAt(editor, [
          ...startBlockPath,
          'children',
          {_key: startBlockEntry.node.children[i]!._key},
        ])
      }
    }
  }

  // Remove the blocks between start and end (exclusive). Both blocks share the
  // same parent (`deleteRange` only enters this branch for a cross-block range
  // within one container).
  const startParent = parentPath(startBlockPath)
  const startSegment = startBlockPath.at(-1)!
  const endSegment = endBlockPath.at(-1)!
  const siblings = getChildren(editor, startParent)
  const startIdx = siblings.findIndex((entry) =>
    segmentMatches(entry.path.at(-1), startSegment),
  )
  const endIdx = siblings.findIndex((entry) =>
    segmentMatches(entry.path.at(-1), endSegment),
  )
  if (startIdx !== -1 && endIdx !== -1) {
    for (let i = endIdx - 1; i > startIdx; i--) {
      const sibling = siblings[i]
      if (sibling) {
        removeNodeAt(editor, sibling.path)
      }
    }
  }

  const endBlockSibling = getSibling(editor, startBlockPath, 'next')
  const adjustedEndBlockPath: Path = endBlockSibling
    ? endBlockSibling.path
    : startBlockPath
  if (end.path.length > 1) {
    const endBlockNodeEntry = getTextBlockNode(editor, adjustedEndBlockPath)
    if (endBlockNodeEntry) {
      const endChildIndex = resolveChildIndex(
        endBlockNodeEntry.node.children,
        end.path.at(-1)!,
      )
      for (let i = 0; i < endChildIndex; i++) {
        const firstChild = getTextBlockNode(editor, adjustedEndBlockPath)?.node
          .children[0]
        if (firstChild) {
          removeNodeAt(editor, [
            ...adjustedEndBlockPath,
            'children',
            {_key: firstChild._key},
          ])
        }
      }
    }

    const endBlockRefetched = getTextBlockNode(editor, adjustedEndBlockPath)
    const firstChild = endBlockRefetched?.node.children[0]
    const endNodePath = firstChild
      ? [...adjustedEndBlockPath, 'children', {_key: firstChild._key}]
      : [...adjustedEndBlockPath, 'children', 0]
    const endNodeEntry = getSpanNode(editor, endNodePath)
    if (endNodeEntry && end.offset > 0) {
      const textToRemove = endNodeEntry.node.text.slice(0, end.offset)
      editor.apply({
        type: 'remove_text',
        path: endNodePath,
        offset: 0,
        text: textToRemove,
      })
    }
  }

  const startBlockEntry = getTextBlockNode(editor, startBlockPath)
  const endBlockEntry = getTextBlockNode(editor, adjustedEndBlockPath)
  if (startBlockEntry && endBlockEntry) {
    const startBlockNode = startBlockEntry.node
    const endBlockNode = endBlockEntry.node
    if (
      Array.isArray(endBlockNode.markDefs) &&
      endBlockNode.markDefs.length > 0
    ) {
      const oldDefs =
        (Array.isArray(startBlockNode.markDefs) && startBlockNode.markDefs) ||
        []
      const newMarkDefs = [
        ...new Map(
          [...oldDefs, ...endBlockNode.markDefs].map((def) => [def._key, def]),
        ).values(),
      ]
      setNodeProperties(editor, {markDefs: newMarkDefs}, startBlockPath)
    }
    applyMergeNode(editor, adjustedEndBlockPath, startBlockNode.children.length)
  }
}

/**
 * Compare a resolved path segment against an expected segment from the
 * block's path. Both sides may be `KeyedSegment` (string key) or numeric
 * index (non-keyed arrays).
 */
function segmentMatches(
  actual: unknown,
  expected: string | number | {_key: string} | unknown,
): boolean {
  if (isKeyedSegment(actual) && isKeyedSegment(expected)) {
    return actual._key === expected._key
  }
  return actual === expected
}

function removeNodeAt(editor: PortableTextSlateEditor, path: Path) {
  const nodeEntry = getNode(editor, path)

  if (!nodeEntry) {
    return
  }

  editor.apply({
    type: 'unset',
    path: nodeEntry.path,
  })
}
