import type {PortableTextTextBlock} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import {applyMergeNode} from '../internal-utils/apply-merge-node'
import {resolveSelection} from '../internal-utils/apply-selection'
import {applySetNode} from '../internal-utils/apply-set-node'
import {applySplitNode} from '../internal-utils/apply-split-node'
import {isEqualChildren, isEqualMarks} from '../internal-utils/equality'
import {safeStringify} from '../internal-utils/safe-json'
import {toSlateBlock} from '../internal-utils/values'
import {getChildren} from '../node-traversal/get-children'
import {getNode} from '../node-traversal/get-node'
import {getSibling} from '../node-traversal/get-sibling'
import {getSpanNode} from '../node-traversal/get-span-node'
import {getTextBlockNode} from '../node-traversal/get-text-block-node'
import {isBlock} from '../node-traversal/is-block'
import {end as editorEnd} from '../slate/editor/end'
import {pathRef} from '../slate/editor/path-ref'
import {pointRef} from '../slate/editor/point-ref'
import {rangeRef} from '../slate/editor/range-ref'
import {start as editorStart} from '../slate/editor/start'
import {withoutNormalizing} from '../slate/editor/without-normalizing'
import type {Node} from '../slate/interfaces/node'
import type {InsertNodeOperation} from '../slate/interfaces/operation'
import type {Path} from '../slate/interfaces/path'
import type {Point} from '../slate/interfaces/point'
import type {Range} from '../slate/interfaces/range'
import {isObjectNode} from '../slate/node/is-object-node'
import {parentPath} from '../slate/path/parent-path'
import {pathEquals} from '../slate/path/path-equals'
import {pointEquals} from '../slate/point/point-equals'
import {isCollapsedRange} from '../slate/range/is-collapsed-range'
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
 * Resolve a path segment to a numeric child index within a parent's children.
 * Keyed segments are looked up by _key, numbers are returned as-is.
 * Returns -1 if the segment cannot be resolved.
 */
function resolveChildIndex(
  children: Array<{_key: string}>,
  segment: import('../slate/interfaces/path').PathSegment,
): number {
  if (typeof segment === 'number') {
    return segment
  }
  if (isKeyedSegment(segment)) {
    return children.findIndex((child) => child._key === segment._key)
  }
  return -1
}

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

  insertBlock({
    context,
    block,
    placement: operation.placement,
    select: operation.select ?? 'start',
    at: operation.at,
    editor: operation.editor,
  })
}

function insertBlock(options: {
  context: OperationContext
  block: Node
  placement: 'auto' | 'after' | 'before'
  select: 'start' | 'end' | 'none'
  at?: NonNullable<EditorSelection>
  editor: PortableTextSlateEditor
}) {
  const {context, block, placement, select, editor} = options
  const at = options.at
    ? resolveSelection(editor, options.at)
    : editor.selection

  // Handle empty editor case
  if (editor.children.length === 0) {
    insertNodeAt(editor, [0], block, select)
    return
  }

  // Fall back to the start and end of the editor if neither an editor
  // selection nor an `at` range is provided
  const start = at ? rangeStart(at, editor) : editorStart(editor, [])
  const end = at ? rangeEnd(at, editor) : editorEnd(editor, [])

  const findContainingBlock = (
    pointPath: Path,
  ): {node: Node; path: Path} | undefined => {
    // Check each prefix of the path from longest to shortest (deepest first)
    // to find the closest containing block.
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

  const startBlockEntry = findContainingBlock(start.path)
  const startBlock = startBlockEntry?.node
  const startBlockPath = startBlockEntry?.path
  const endBlockEntry = findContainingBlock(end.path)
  let endBlock = endBlockEntry?.node
  let endBlockPath = endBlockEntry?.path

  if (!startBlock || !startBlockPath || !endBlock || !endBlockPath) {
    throw new Error('Unable to insert block without a start and end block')
  }

  if (placement === 'before') {
    insertNodeAt(editor, startBlockPath, block, select)
    return
  }

  if (placement === 'after') {
    insertNodeAt(editor, endBlockPath, block, select, 'after')
    return
  }

  if (!at) {
    if (isEmptyTextBlock(context, endBlock)) {
      replaceEmptyTextBlock(editor, endBlockPath, block, select)
      return
    }

    if (
      isTextBlock({schema: editor.schema}, block) &&
      isTextBlock({schema: editor.schema}, endBlock)
    ) {
      const selectionBefore = editorEnd(editor, endBlockPath)
      insertTextBlockFragment(editor, block, selectionBefore)

      if (select === 'start') {
        setSelectionToPoint(editor, selectionBefore)
      } else if (select === 'none') {
        clearSelection(editor)
      }
      return
    }

    insertNodeAt(editor, endBlockPath, block, select, 'after')
    return
  }

  if (isExpandedRange(at) && !isTextBlock({schema: editor.schema}, block)) {
    const atBeforeDelete = rangeRef(editor, at, {affinity: 'inward'})

    // Remember if the selection started at the beginning of the block
    const start = rangeStart(at, editor)
    const startBlockEntry = getTextBlockNode(editor, [start.path[0]!])
    const startOfBlock = editorStart(editor, [start.path[0]!])
    const isAtStartOfBlock =
      startBlockEntry !== undefined && pointEquals(start, startOfBlock)

    // Delete the expanded range
    deleteExpandedRange(editor, at)

    const atAfterDelete = atBeforeDelete.unref() ?? editor.selection

    const atBeforeInsert = atAfterDelete
      ? rangeRef(editor, atAfterDelete, {affinity: 'inward'})
      : undefined

    // Insert the block at the position after delete
    if (atAfterDelete) {
      // If selection was at start of block, insert before; otherwise insert after
      const insertPath: Path = [atAfterDelete.anchor.path[0]!]
      const insertPosition: 'before' | 'after' = isAtStartOfBlock
        ? 'before'
        : 'after'
      const op: InsertNodeOperation = {
        type: 'insert_node',
        path: insertPath,
        node: block,
        position: insertPosition,
      }
      editor.apply(op)

      if (select !== 'none') {
        const insertedBlockPath: Path = [{_key: op.node._key}]
        const point = editorStart(editor, insertedBlockPath)
        editor.apply({
          type: 'set_selection',
          properties: editor.selection,
          newProperties: {anchor: point, focus: point},
        })
      }
    }

    const atAfterInsert = atBeforeInsert?.unref() ?? editor.selection

    if (select === 'none' && atAfterInsert) {
      editor.apply({
        type: 'set_selection',
        properties: editor.selection,
        newProperties: atAfterInsert,
      })
    }

    // Check if we need to remove an empty text block that was left after insertion
    if (!isTextBlock({schema: editor.schema}, block) && atAfterDelete) {
      // If we inserted before (isAtStartOfBlock), check the block that was pushed down
      // Otherwise, check the block before the insertion
      const emptyBlockPath: Path = isAtStartOfBlock
        ? [atAfterDelete.anchor.path[0]!]
        : [atAfterDelete.anchor.path[0]!]
      const potentiallyEmptyBlockEntry = getTextBlockNode(
        editor,
        emptyBlockPath,
      )
      if (
        potentiallyEmptyBlockEntry &&
        isEmptyTextBlock(context, potentiallyEmptyBlockEntry.node)
      ) {
        editor.apply({
          type: 'remove_node',
          path: potentiallyEmptyBlockEntry.path,
          node: potentiallyEmptyBlockEntry.node,
        })
      }
    }

    return
  }

  // Handle collapsed selection with block object insertion in the middle of a text block
  if (
    !isTextBlock({schema: editor.schema}, block) &&
    isTextBlock({schema: editor.schema}, endBlock) &&
    !isExpandedRange(at)
  ) {
    const selectionPoint = rangeStart(at, editor)
    const blockPath: Path = [selectionPoint.path[0]!]
    const blockStartPoint = editorStart(editor, blockPath)
    const blockEndPoint = editorEnd(editor, blockPath)

    // Check if we're in the middle of the block (not at start or end)
    const isAtBlockStart = pointEquals(selectionPoint, blockStartPoint)
    const isAtBlockEnd = pointEquals(selectionPoint, blockEndPoint)

    if (!isAtBlockStart && !isAtBlockEnd) {
      // We need to split the block at the selection point
      const currentBlockEntry = getTextBlockNode(editor, blockPath)
      if (!currentBlockEntry) {
        return
      }
      // Find the child index and offset within that child
      const childSegment = selectionPoint.path[2]
      const childIndex = childSegment
        ? resolveChildIndex(currentBlockEntry.node.children, childSegment)
        : -1
      const childOffset = selectionPoint.offset

      // Split the text node at the offset if needed
      if (childOffset > 0) {
        const textNodeEntry = getSpanNode(editor, selectionPoint.path)
        if (textNodeEntry) {
          if (childOffset < textNodeEntry.node.text.length) {
            applySplitNode(editor, selectionPoint.path, childOffset)
          }
        }
      }

      // Now split the block itself
      const splitAtIndex = childOffset > 0 ? childIndex + 1 : childIndex
      applySplitNode(editor, blockPath, splitAtIndex)

      // Insert the block object between the two split blocks
      const middleInsertOp: InsertNodeOperation = {
        type: 'insert_node',
        path: blockPath,
        node: block,
        position: 'after',
      }
      editor.apply(middleInsertOp)

      // Handle selection based on select parameter
      if (select === 'none') {
        // Restore selection to end of first block (where the user was typing)
        const firstBlockEndPoint = editorEnd(editor, blockPath)
        editor.apply({
          type: 'set_selection',
          properties: editor.selection,
          newProperties: {
            anchor: firstBlockEndPoint,
            focus: firstBlockEndPoint,
          },
        })
      } else if (select === 'start') {
        const insertedBlockPath: Path = [{_key: middleInsertOp.node._key}]
        const point = editorStart(editor, insertedBlockPath)
        editor.apply({
          type: 'set_selection',
          properties: editor.selection,
          newProperties: {anchor: point, focus: point},
        })
      } else if (select === 'end') {
        const insertedBlockPath: Path = [{_key: middleInsertOp.node._key}]
        const point = editorEnd(editor, insertedBlockPath)
        editor.apply({
          type: 'set_selection',
          properties: editor.selection,
          newProperties: {anchor: point, focus: point},
        })
      }

      return
    }
  }

  if (
    isTextBlock({schema: editor.schema}, endBlock) &&
    isTextBlock({schema: editor.schema}, block)
  ) {
    let selectionStartPoint = rangeStart(at, editor)
    let wasCrossBlockDeletion = false

    // If there's an expanded selection, delete it first
    if (isExpandedRange(at)) {
      const [start, end] = rangeEdges(at, {}, editor)
      const isCrossBlock =
        isKeyedSegment(start.path[0]!) && isKeyedSegment(end.path[0]!)
          ? start.path[0]!._key !== end.path[0]!._key
          : start.path[0] !== end.path[0]

      deleteExpandedRange(editor, at)

      // For cross-block deletion, set selection to the merge point
      if (isCrossBlock) {
        wasCrossBlockDeletion = true
        const startBlockPath: Path = [start.path[0]!]
        const mergedBlockEntry = getTextBlockNode(editor, startBlockPath)
        if (mergedBlockEntry) {
          // Find the merge position (where blocks were joined)
          const mergePoint: Point = {
            path: [...startBlockPath, 'children', start.path[2]!],
            offset: start.offset,
          }
          setSelectionToPoint(editor, mergePoint)
          // Update selectionStartPoint to the merge point for later use
          selectionStartPoint = mergePoint
        }
      }

      // After deletion, refetch the end block since paths may have changed
      const lastIndex = editor.children.length - 1
      const lastBlock = lastIndex >= 0 ? editor.children[lastIndex] : undefined
      const newEndBlock = lastBlock
      const newEndBlockPath: Path | undefined = lastBlock?._key
        ? [{_key: lastBlock._key}]
        : undefined

      if (
        newEndBlock &&
        newEndBlockPath &&
        (isTextBlock({schema: editor.schema}, newEndBlock) ||
          isObjectNode({schema: editor.schema}, newEndBlock))
      ) {
        endBlock = newEndBlock
        endBlockPath = newEndBlockPath
      }
    }

    // After potential reassignment, verify endBlock is still a text block
    if (!isTextBlock({schema: editor.schema}, endBlock)) {
      return
    }

    if (isEmptyTextBlock(context, endBlock)) {
      replaceEmptyTextBlock(editor, endBlockPath, block, select)
      return
    }

    const endBlockChildKeys = endBlock.children.map((child) => child._key)
    const endBlockMarkDefsKeys =
      endBlock.markDefs?.map((markDef) => markDef._key) ?? []

    // Assign new keys to markDefs with duplicate keys and keep track of
    // the mapping between the old and new keys
    const markDefKeyMap = new Map<string, string>()
    const adjustedMarkDefs = block.markDefs?.map((markDef) => {
      if (endBlockMarkDefsKeys.includes(markDef._key)) {
        const newKey = context.keyGenerator()
        markDefKeyMap.set(markDef._key, newKey)
        return {
          ...markDef,
          _key: newKey,
        }
      }

      return markDef
    })

    // Assign new keys to spans with duplicate keys and update any markDef
    // key if needed
    const adjustedChildren = block.children.map((child) => {
      if (isSpan(context, child)) {
        const marks =
          child.marks?.map((mark) => {
            const markDefKey = markDefKeyMap.get(mark)

            if (markDefKey) {
              return markDefKey
            }

            return mark
          }) ?? []

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
        return {
          ...child,
          _key: context.keyGenerator(),
        }
      }

      return child
    })

    // Carry over the markDefs from the incoming block to the end block
    const endBlockNodeEntry = getTextBlockNode(editor, endBlockPath)

    if (endBlockNodeEntry) {
      const properties: Partial<PortableTextTextBlock> = {
        markDefs: endBlockNodeEntry.node.markDefs,
      }
      const newProperties: Partial<PortableTextTextBlock> = {
        markDefs: [...(endBlock.markDefs ?? []), ...(adjustedMarkDefs ?? [])],
      }

      editor.apply({
        type: 'set_node',
        path: endBlockPath,
        properties,
        newProperties,
      })
    }

    // If the children have changed, we need to create a new block with
    // the adjusted children
    const adjustedBlock = !isEqualChildren(
      block.children,
      adjustedChildren,
      context.schema.span.name,
    )
      ? {
          ...block,
          children: adjustedChildren,
        }
      : block

    if (select === 'end') {
      const insertAt = editor.selection
        ? rangeEnd(editor.selection)
        : editorEnd(editor, endBlockPath)

      insertTextBlockFragment(editor, adjustedBlock, insertAt)

      return
    }

    // Use selectionStartPoint (updated after any deletion) instead of stale rangeStart(at, editor)
    const firstInsertedKey = insertTextBlockFragment(
      editor,
      adjustedBlock,
      selectionStartPoint,
    )

    if (select === 'start' && firstInsertedKey) {
      const firstInsertedPath: Path = [
        ...parentPath(selectionStartPoint.path),
        'children',
        {_key: firstInsertedKey},
      ]
      const point = editorStart(editor, firstInsertedPath)
      setSelectionToPoint(editor, point)
    } else if (select === 'none') {
      // For cross-block deletion, always set to insertion point
      // Otherwise, only set if not at block start (to keep cursor at end of inserted content)
      if (wasCrossBlockDeletion) {
        setSelectionToPoint(editor, selectionStartPoint)
      } else {
        const endBlockStartPoint = editorStart(editor, endBlockPath)
        if (!pointEquals(selectionStartPoint, endBlockStartPoint)) {
          setSelectionToPoint(editor, selectionStartPoint)
        }
      }
    }
    // For 'end', selection is already at the right place after insertTextBlockFragment
  } else {
    // Inserting block object (not text block) into an existing block
    if (!isTextBlock({schema: editor.schema}, endBlock)) {
      // End block is not a text block - just insert after it
      insertNodeAt(editor, endBlockPath, block, select, 'after')
      return
    }

    const endBlockStartPoint = editorStart(editor, endBlockPath)
    const endBlockEndPoint = editorEnd(editor, endBlockPath)
    const selectionStartPoint = rangeStart(at, editor)
    const selectionEndPoint = rangeEnd(at, editor)

    // Collapsed selection at start of block - insert before
    if (
      isCollapsedRange(at) &&
      pointEquals(selectionStartPoint, endBlockStartPoint)
    ) {
      const insertBeforeOp: InsertNodeOperation = {
        type: 'insert_node',
        path: endBlockPath,
        node: block,
        position: 'before',
      }
      editor.apply(insertBeforeOp)
      if (isEmptyTextBlock(context, endBlock)) {
        removeNodeAt(editor, endBlockPath)
        if (select !== 'none') {
          setSelection(editor, [{_key: insertBeforeOp.node._key}], 'start')
        }
      } else {
        if (select !== 'none') {
          setSelection(editor, endBlockPath, 'start')
        }
      }
      return
    }

    // Collapsed selection at end of block - insert after
    if (
      isCollapsedRange(at) &&
      pointEquals(selectionEndPoint, endBlockEndPoint)
    ) {
      const insertAfterOp: InsertNodeOperation = {
        type: 'insert_node',
        path: endBlockPath,
        node: block,
        position: 'after',
      }
      editor.apply(insertAfterOp)
      if (select !== 'none') {
        setSelection(editor, [{_key: insertAfterOp.node._key}], 'start')
      }
      return
    }
    // General case: selection in the middle of the block
    const focusChildSegment = editor.selection?.focus.path.at(2)
    const focusBlockPath = editor.selection?.focus.path.slice(0, 1)
    const focusChild =
      focusChildSegment !== undefined && focusBlockPath
        ? getChildren(editor, focusBlockPath).find(
            (entry) =>
              isKeyedSegment(focusChildSegment) &&
              entry.node._key === focusChildSegment._key,
          )?.node
        : undefined

    if (focusChild && isSpan({schema: editor.schema}, focusChild)) {
      const startPoint = rangeStart(at, editor)

      if (isTextBlock({schema: editor.schema}, block)) {
        // Inserting text block: split the text node and insert fragment
        const nodeToSplitEntry = getSpanNode(editor, startPoint.path)
        if (nodeToSplitEntry) {
          applySplitNode(editor, startPoint.path, startPoint.offset)
        }

        insertTextBlockFragment(editor, block, startPoint)

        if (select === 'none') {
          setSelectionToRange(editor, at)
        } else {
          const nextBlock = getSibling(editor, endBlockPath, 'next')
          if (nextBlock) {
            setSelection(editor, nextBlock.path, 'start')
          }
        }
      } else {
        // Inserting block object: split the entire block and insert between
        // First split all ancestor nodes up to the block level
        let currentPath = startPoint.path
        let currentOffset = startPoint.offset

        // Create a point ref to track where the cursor should be after operations
        const cursorPositionRef = pointRef(editor, startPoint, {
          affinity: 'backward',
        })

        // Create a path ref to track the first block's path as it changes
        const blockPath: Path = [currentPath[0]!]
        const firstBlockPathRef = pathRef(editor, blockPath)

        // Split text node first
        const textNodeEntry = getSpanNode(editor, currentPath)
        if (
          textNodeEntry &&
          currentOffset > 0 &&
          currentOffset < textNodeEntry.node.text.length
        ) {
          applySplitNode(editor, currentPath, currentOffset)
          const nextSpan = getSibling(editor, currentPath, 'next')
          if (nextSpan) {
            currentPath = nextSpan.path
          }
          currentOffset = 0
        }

        // Split the block, preserving block properties
        const blockToSplitEntry = getTextBlockNode(editor, blockPath)
        const currentChildSegment = currentPath[2]
        const currentChildIndex =
          blockToSplitEntry && currentChildSegment
            ? resolveChildIndex(
                blockToSplitEntry.node.children,
                currentChildSegment,
              )
            : -1
        const splitAtIndex =
          currentOffset > 0 ? currentChildIndex + 1 : currentChildIndex

        if (
          blockToSplitEntry &&
          splitAtIndex >= 0 &&
          splitAtIndex < blockToSplitEntry.node.children.length
        ) {
          // Get the properties to preserve in the split
          applySplitNode(editor, blockPath, splitAtIndex)
        }

        // Get the current path of the first block after splits
        const currentFirstBlockPath = firstBlockPathRef.unref()

        // Insert block object between the split blocks
        const insertAfterPath: Path = currentFirstBlockPath ?? blockPath
        const splitInsertOp: InsertNodeOperation = {
          type: 'insert_node',
          path: insertAfterPath,
          node: block,
          position: 'after',
        }
        editor.apply(splitInsertOp)

        if (select === 'start' || select === 'end') {
          const insertedBlockPath: Path = [{_key: splitInsertOp.node._key}]
          const point = editorStart(editor, insertedBlockPath)
          editor.apply({
            type: 'set_selection',
            properties: editor.selection,
            newProperties: {anchor: point, focus: point},
          })
        } else {
          // For select: 'none', use the cursor position ref which tracks through operations
          const point = cursorPositionRef.unref()
          if (point) {
            editor.apply({
              type: 'set_selection',
              properties: editor.selection,
              newProperties: {anchor: point, focus: point},
            })
          }
        }
      }
    } else {
      // Not on a text span - just insert after
      const insertAfterOp: InsertNodeOperation = {
        type: 'insert_node',
        path: endBlockPath,
        node: block,
        position: 'after',
      }
      editor.apply(insertAfterOp)
      const insertedBlockPath: Path = [{_key: insertAfterOp.node._key}]
      if (select === 'none') {
        setSelectionToRange(editor, at)
      } else {
        setSelection(editor, insertedBlockPath, select)
      }
    }
  }
}

/**
 * Sets the editor selection to a point at the given path.
 * @param position - 'start' sets to beginning, 'end' sets to end of the path
 */
function setSelection(
  editor: PortableTextSlateEditor,
  path: Path,
  position: 'start' | 'end',
) {
  const point =
    position === 'start' ? editorStart(editor, path) : editorEnd(editor, path)
  editor.apply({
    type: 'set_selection',
    properties: editor.selection,
    newProperties: {anchor: point, focus: point},
  })
}

/**
 * Clears the current selection (sets it to null).
 */
function clearSelection(editor: PortableTextSlateEditor) {
  if (editor.selection) {
    editor.apply({
      type: 'set_selection',
      properties: editor.selection,
      newProperties: null,
    })
  }
}

/**
 * Sets the selection to a specific point.
 */
function setSelectionToPoint(editor: PortableTextSlateEditor, point: Point) {
  editor.apply({
    type: 'set_selection',
    properties: editor.selection,
    newProperties: {anchor: point, focus: point},
  })
}

/**
 * Sets the selection to a specific range.
 */
function setSelectionToRange(editor: PortableTextSlateEditor, range: Range) {
  editor.apply({
    type: 'set_selection',
    properties: editor.selection,
    newProperties: range,
  })
}

/**
 * Inserts a node at the given path and optionally sets selection.
 */
function insertNodeAt(
  editor: PortableTextSlateEditor,
  path: Path,
  node: Node,
  select: 'start' | 'end' | 'none',
  position: 'before' | 'after' = 'before',
) {
  const op: InsertNodeOperation = {type: 'insert_node', path, node, position}
  editor.apply(op)
  // Use op.node._key because apply-operation may have re-keyed the node
  // to resolve duplicate keys
  const insertedPath: Path = [{_key: op.node._key}]
  if (select !== 'none') {
    setSelection(editor, insertedPath, select)
  }
}

/**
 * Removes a node at the given path.
 */
function removeNodeAt(editor: PortableTextSlateEditor, path: Path) {
  const nodeEntry = getNode(editor, path)

  if (!nodeEntry) {
    return
  }

  const {node, path: nodePath} = nodeEntry
  editor.apply({
    type: 'remove_node',
    path: nodePath,
    node,
  })
}

/**
 * Replaces an empty text block with a new block and handles selection.
 */
function replaceEmptyTextBlock(
  editor: PortableTextSlateEditor,
  blockPath: Path,
  newBlock: Node,
  select: 'start' | 'end' | 'none',
) {
  const hadSelection = editor.selection !== null

  const op: InsertNodeOperation = {
    type: 'insert_node',
    path: blockPath,
    node: newBlock,
    position: 'before',
  }
  editor.apply(op)
  removeNodeAt(editor, blockPath)

  if (select === 'none' && !hadSelection) {
    return
  }

  const newBlockPath: Path = [{_key: op.node._key}]
  const point =
    select === 'end'
      ? editorEnd(editor, newBlockPath)
      : editorStart(editor, newBlockPath)

  clearSelection(editor)
  editor.apply({
    type: 'set_selection',
    properties: null,
    newProperties: {anchor: point, focus: point},
  })
}

/**
 * Deletes content within a single block (same block deletion).
 */
function deleteSameBlockRange(
  editor: PortableTextSlateEditor,
  start: Point,
  end: Point,
) {
  const blockPath: Path = [start.path[0]!]

  if (pathEquals(start.path, end.path)) {
    // Same text node - simple text removal
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

  // Different nodes in same block
  // Remove from start node to end
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

  // Remove nodes between start and end
  const blockEntry = getTextBlockNode(editor, blockPath)
  if (blockEntry) {
    const startChildIndex = resolveChildIndex(
      blockEntry.node.children,
      start.path[2]!,
    )
    const endChildIndex = resolveChildIndex(
      blockEntry.node.children,
      end.path[2]!,
    )
    for (let i = endChildIndex - 1; i > startChildIndex; i--) {
      removeNodeAt(editor, [
        ...blockPath,
        'children',
        {_key: blockEntry.node.children[i]!._key},
      ])
    }
  }

  // Remove from beginning of end node
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

  // Merge adjacent text nodes
  const startNodeAfterEntry = getSpanNode(editor, start.path)
  const endNodeAfterEntry = getSpanNode(editor, newEndPath)
  if (startNodeAfterEntry && endNodeAfterEntry) {
    applyMergeNode(editor, newEndPath, startNodeAfterEntry.node.text.length)
  }
}

/**
 * Deletes content across multiple blocks (cross-block deletion).
 * Handles removal and merging of blocks.
 */
function deleteCrossBlockRange(
  editor: PortableTextSlateEditor,
  start: Point,
  end: Point,
) {
  const startBlockPath: Path = [start.path[0]!]

  // Remove from start position to end of start block
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

    // Remove remaining nodes in start block
    const startBlockEntry = getTextBlockNode(editor, startBlockPath)
    if (startBlockEntry) {
      const startChildIndex = resolveChildIndex(
        startBlockEntry.node.children,
        start.path[2]!,
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

  // Remove all blocks between start and end
  const startBlockKey = isKeyedSegment(start.path[0]!)
    ? start.path[0]!._key
    : undefined
  const endBlockKey = isKeyedSegment(end.path[0]!)
    ? end.path[0]!._key
    : undefined
  if (startBlockKey && endBlockKey) {
    const startIdx = editor.children.findIndex((b) => b._key === startBlockKey)
    const endIdx = editor.children.findIndex((b) => b._key === endBlockKey)
    for (let i = endIdx - 1; i > startIdx; i--) {
      removeNodeAt(editor, [{_key: editor.children[i]!._key}])
    }
  }

  // Remove from beginning of end block to end position
  const endBlockSibling = getSibling(editor, startBlockPath, 'next')
  const adjustedEndBlockPath: Path = endBlockSibling
    ? endBlockSibling.path
    : startBlockPath
  if (end.path.length > 1) {
    // Remove nodes before end position
    const endBlockNodeEntry = getTextBlockNode(editor, adjustedEndBlockPath)
    if (endBlockNodeEntry) {
      const endChildIndex = resolveChildIndex(
        endBlockNodeEntry.node.children,
        end.path[2]!,
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

    // Remove text from end node
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

  // Merge the blocks if both are text blocks
  const startBlockEntry = getTextBlockNode(editor, startBlockPath)
  const endBlockEntry = getTextBlockNode(editor, adjustedEndBlockPath)
  if (startBlockEntry && endBlockEntry) {
    const startBlockNode = startBlockEntry.node
    const endBlockNode = endBlockEntry.node
    // Wrap in withoutNormalizing so normalization doesn't strip the copied
    // markDefs before the merge moves the children that reference them.
    withoutNormalizing(editor, () => {
      if (
        Array.isArray(endBlockNode.markDefs) &&
        endBlockNode.markDefs.length > 0
      ) {
        const oldDefs =
          (Array.isArray(startBlockNode.markDefs) && startBlockNode.markDefs) ||
          []
        const newMarkDefs = [
          ...new Map(
            [...oldDefs, ...endBlockNode.markDefs].map((def) => [
              def._key,
              def,
            ]),
          ).values(),
        ]
        applySetNode(editor, {markDefs: newMarkDefs}, startBlockPath)
      }
      applyMergeNode(
        editor,
        adjustedEndBlockPath,
        startBlockNode.children.length,
      )
    })
  }
}

/**
 * Deletes an expanded range, handling both same-block and cross-block cases.
 */
function deleteExpandedRange(
  editor: PortableTextSlateEditor,
  range: Range,
): void {
  const [start, end] = rangeEdges(range, {}, editor)

  if (
    isKeyedSegment(start.path[0]!) && isKeyedSegment(end.path[0]!)
      ? start.path[0]!._key === end.path[0]!._key
      : start.path[0] === end.path[0]
  ) {
    deleteSameBlockRange(editor, start, end)
  } else {
    deleteCrossBlockRange(editor, start, end)
  }
}

/**
 * Inserts a text block's children at a point within another text block.
 */
function insertTextBlockFragment(
  editor: PortableTextSlateEditor,
  block: Node,
  at: Point,
): string | undefined {
  if (!isTextBlock({schema: editor.schema}, block)) {
    return undefined
  }

  // Split the text node at the insertion point if needed
  if (at.offset > 0) {
    const textNodeEntry = getSpanNode(editor, at.path)

    if (textNodeEntry) {
      applySplitNode(editor, at.path, at.offset)
    }
  }

  const parent = parentPath(at.path)
  let firstInsertedKey: string | undefined

  // When inserting a single child at offset 0, prepend its text into the
  // existing span using insert_text instead of insert_node. This avoids
  // creating a new DOM element that React hasn't rendered yet, which would
  // cause the DOM selection to become stale during deferred normalization.
  // Only safe with a single child because multiple children need to go
  // BEFORE the existing span, and insert_text can't reorder spans.
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

  // Fallback: insert each child as a node (used when offset > 0 or
  // when the first child can't be merged into the existing span)
  let insertAfterPath = at.path

  for (const child of block.children) {
    const op: InsertNodeOperation = {
      type: 'insert_node',
      path: insertAfterPath,
      node: child,
      position:
        at.offset > 0 || child !== block.children[0] ? 'after' : 'before',
    }
    editor.apply(op)
    insertAfterPath = [...parent, 'children', {_key: op.node._key}]
    if (firstInsertedKey === undefined) {
      firstInsertedKey = op.node._key
    }
  }

  return firstInsertedKey
}
