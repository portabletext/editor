import type {PortableTextTextBlock} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import {applyMergeNode} from '../internal-utils/apply-merge-node'
import {applySetNode} from '../internal-utils/apply-set-node'
import {applySplitNode} from '../internal-utils/apply-split-node'
import {isEqualChildren, isEqualMarks} from '../internal-utils/equality'
import {safeStringify} from '../internal-utils/safe-json'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {toSlateBlock} from '../internal-utils/values'
import {getChildren} from '../node-traversal/get-children'
import {getNode} from '../node-traversal/get-node'
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
import type {Path} from '../slate/interfaces/path'
import type {Point} from '../slate/interfaces/point'
import type {Range} from '../slate/interfaces/range'
import {isObjectNode} from '../slate/node/is-object-node'
import {nextPath} from '../slate/path/next-path'
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
import type {OperationContext, OperationImplementation} from './operation.types'

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
    ? toSlateRange({
        context: {
          schema: context.schema,
          value: editor.children,
          selection: options.at,
        },
        blockIndexMap: editor.blockIndexMap,
      })
    : editor.selection

  // Handle empty editor case
  if (editor.children.length === 0) {
    insertNodeAt(editor, [0], block, select)
    return
  }

  // Fall back to the start and end of the editor if neither an editor
  // selection nor an `at` range is provided
  const start = at ? rangeStart(at) : editorStart(editor, [])
  const end = at ? rangeEnd(at) : editorEnd(editor, [])

  const findContainingBlock = (
    pointPath: Array<number>,
  ): {node: Node; path: Array<number>} | undefined => {
    // Check each prefix of the path from longest to shortest (deepest first)
    // to find the closest containing block.
    for (let length = pointPath.length; length >= 1; length--) {
      const candidatePath = pointPath.slice(0, length)
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
    insertNodeAt(editor, nextPath(endBlockPath), block, select)
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

    insertNodeAt(editor, nextPath(endBlockPath), block, select)
    return
  }

  if (isExpandedRange(at) && !isTextBlock({schema: editor.schema}, block)) {
    const atBeforeDelete = rangeRef(editor, at, {affinity: 'inward'})

    // Remember if the selection started at the beginning of the block
    const start = rangeStart(at)
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
      const insertPath: Path = isAtStartOfBlock
        ? [atAfterDelete.anchor.path[0]!]
        : [atAfterDelete.anchor.path[0]! + 1]
      editor.apply({type: 'insert_node', path: insertPath, node: block})

      if (select !== 'none') {
        const point = editorStart(editor, insertPath)
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
        ? [atAfterDelete.anchor.path[0]! + 1]
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
    const selectionPoint = rangeStart(at)
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
      const currentBlock = currentBlockEntry.node

      // Find the child index and offset within that child
      const childIndex = selectionPoint.path[1]!
      const childOffset = selectionPoint.offset

      // Split the text node at the offset if needed
      if (childOffset > 0) {
        const textNodeEntry = getSpanNode(editor, selectionPoint.path)
        if (textNodeEntry) {
          const textNode = textNodeEntry.node
          if (childOffset < textNode.text.length) {
            const {text: _, ...properties} = textNode
            applySplitNode(editor, selectionPoint.path, childOffset, properties)
          }
        }
      }

      // Now split the block itself
      const splitAtIndex = childOffset > 0 ? childIndex + 1 : childIndex
      const {children: _, ...blockProperties} = currentBlock
      applySplitNode(editor, blockPath, splitAtIndex, blockProperties)

      // Insert the block object between the two split blocks
      const insertPath: Path = [blockPath[0]! + 1]
      editor.apply({type: 'insert_node', path: insertPath, node: block})

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
        const point = editorStart(editor, insertPath)
        editor.apply({
          type: 'set_selection',
          properties: editor.selection,
          newProperties: {anchor: point, focus: point},
        })
      } else if (select === 'end') {
        const point = editorEnd(editor, insertPath)
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
    let selectionStartPoint = rangeStart(at)
    let wasCrossBlockDeletion = false

    // If there's an expanded selection, delete it first
    if (isExpandedRange(at)) {
      const [start, end] = rangeEdges(at)
      const isCrossBlock = start.path[0] !== end.path[0]

      deleteExpandedRange(editor, at)

      // For cross-block deletion, set selection to the merge point
      if (isCrossBlock) {
        wasCrossBlockDeletion = true
        const startBlockPath: Path = [start.path[0]!]
        const mergedBlockEntry = getTextBlockNode(editor, startBlockPath)
        if (mergedBlockEntry) {
          // Find the merge position (where blocks were joined)
          const mergePoint: Point = {
            path: [...startBlockPath, start.path[1]!],
            offset: start.offset,
          }
          setSelectionToPoint(editor, mergePoint)
          // Update selectionStartPoint to the merge point for later use
          selectionStartPoint = mergePoint
        }
      }

      // After deletion, refetch the end block since paths may have changed
      const lastIndex = editor.children.length - 1
      const lastBlockEntry =
        lastIndex >= 0 ? getNode(editor, [lastIndex]) : undefined
      const newEndBlock = lastBlockEntry?.node
      const newEndBlockPath = lastBlockEntry?.path

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

    // Use selectionStartPoint (updated after any deletion) instead of stale rangeStart(at)
    insertTextBlockFragment(editor, adjustedBlock, selectionStartPoint)

    if (select === 'start') {
      setSelectionToPoint(editor, selectionStartPoint)
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
      insertNodeAt(editor, [endBlockPath[0]! + 1], block, select)
      return
    }

    const endBlockStartPoint = editorStart(editor, endBlockPath)
    const endBlockEndPoint = editorEnd(editor, endBlockPath)
    const selectionStartPoint = rangeStart(at)
    const selectionEndPoint = rangeEnd(at)

    // Collapsed selection at start of block - insert before
    if (
      isCollapsedRange(at) &&
      pointEquals(selectionStartPoint, endBlockStartPoint)
    ) {
      editor.apply({type: 'insert_node', path: endBlockPath, node: block})
      if (select !== 'none') {
        setSelection(editor, endBlockPath, 'start')
      }
      if (isEmptyTextBlock(context, endBlock)) {
        removeNodeAt(editor, nextPath(endBlockPath))
      }
      return
    }

    // Collapsed selection at end of block - insert after
    if (
      isCollapsedRange(at) &&
      pointEquals(selectionEndPoint, endBlockEndPoint)
    ) {
      const nextPath: Path = [endBlockPath[0]! + 1]
      editor.apply({type: 'insert_node', path: nextPath, node: block})
      if (select !== 'none') {
        setSelection(editor, nextPath, 'start')
      }
      return
    }

    // Expanded selection covering entire block - replace the whole block
    if (
      isExpandedRange(at) &&
      pointEquals(selectionStartPoint, endBlockStartPoint) &&
      pointEquals(selectionEndPoint, endBlockEndPoint)
    ) {
      editor.apply({type: 'insert_node', path: endBlockPath, node: block})
      removeNodeAt(editor, nextPath(endBlockPath))
      if (select !== 'none') {
        setSelection(editor, endBlockPath, select)
      }
      return
    }

    // Expanded selection starting at block start - delete prefix and insert
    if (
      isExpandedRange(at) &&
      pointEquals(selectionStartPoint, endBlockStartPoint)
    ) {
      const [, end] = rangeEdges(at)

      // Delete text in end node
      const endNodeEntry = getSpanNode(editor, end.path)
      if (endNodeEntry && end.offset > 0) {
        editor.apply({
          type: 'remove_text',
          path: end.path,
          offset: 0,
          text: endNodeEntry.node.text.slice(0, end.offset),
        })
      }

      // Remove nodes before end
      for (let i = end.path[1]! - 1; i >= 0; i--) {
        removeNodeAt(editor, [...endBlockPath, i])
      }

      insertTextBlockFragment(editor, block, editorStart(editor, endBlockPath))

      if (select !== 'none') {
        setSelection(editor, endBlockPath, select)
      }
      return
    }

    // Expanded selection ending at block end - delete suffix and insert
    if (
      isExpandedRange(at) &&
      pointEquals(selectionEndPoint, endBlockEndPoint)
    ) {
      const [start] = rangeEdges(at)

      // Remove nodes after start
      const blockNodeEntry = getTextBlockNode(editor, endBlockPath)
      if (!blockNodeEntry) {
        return
      }
      for (
        let i = blockNodeEntry.node.children.length - 1;
        i > start.path[1]!;
        i--
      ) {
        removeNodeAt(editor, [...endBlockPath, i])
      }

      // Delete text from start node
      const startNodeEntry = getSpanNode(editor, start.path)
      if (startNodeEntry && start.offset < startNodeEntry.node.text.length) {
        editor.apply({
          type: 'remove_text',
          path: start.path,
          offset: start.offset,
          text: startNodeEntry.node.text.slice(start.offset),
        })
      }

      insertTextBlockFragment(editor, block, start)

      if (select !== 'none') {
        setSelection(editor, nextPath(endBlockPath), select)
      }
      return
    }

    // General case: selection in the middle of the block
    const focusChildIndex = editor.selection?.focus.path.at(1)
    const focusBlockPath = editor.selection?.focus.path.slice(0, 1)
    const focusChild =
      focusChildIndex !== undefined && focusBlockPath
        ? getChildren(editor, focusBlockPath).at(focusChildIndex)?.node
        : undefined

    if (focusChild && isSpan({schema: editor.schema}, focusChild)) {
      const startPoint = rangeStart(at)

      if (isTextBlock({schema: editor.schema}, block)) {
        // Inserting text block: split the text node and insert fragment
        const nodeToSplitEntry = getSpanNode(editor, startPoint.path)
        if (nodeToSplitEntry) {
          const {text: _, ...properties} = nodeToSplitEntry.node
          applySplitNode(editor, startPoint.path, startPoint.offset, properties)
        }

        insertTextBlockFragment(editor, block, startPoint)

        if (select === 'none') {
          setSelectionToRange(editor, at)
        } else {
          setSelection(editor, [endBlockPath[0]! + 1], 'start')
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
          const {text: _, ...properties} = textNodeEntry.node
          applySplitNode(editor, currentPath, currentOffset, properties)
          currentPath = nextPath(currentPath)
          currentOffset = 0
        }

        // Split the block, preserving block properties
        const splitAtIndex =
          currentOffset > 0 ? currentPath[1]! + 1 : currentPath[1]!
        const blockToSplitEntry = getTextBlockNode(editor, blockPath)

        if (
          blockToSplitEntry &&
          splitAtIndex < blockToSplitEntry.node.children.length
        ) {
          // Get the properties to preserve in the split
          const {children: _, ...blockProperties} = blockToSplitEntry.node
          applySplitNode(editor, blockPath, splitAtIndex, blockProperties)
        }

        // Get the current path of the first block after splits
        const currentFirstBlockPath = firstBlockPathRef.unref()

        // Insert block object between the split blocks
        const insertPath: Path = currentFirstBlockPath
          ? [currentFirstBlockPath[0]! + 1]
          : [blockPath[0]! + 1]
        editor.apply({type: 'insert_node', path: insertPath, node: block})

        if (select === 'start' || select === 'end') {
          const point = editorStart(editor, insertPath)
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
      const nextPath: Path = [endBlockPath[0]! + 1]
      editor.apply({type: 'insert_node', path: nextPath, node: block})
      if (select === 'none') {
        setSelectionToRange(editor, at)
      } else {
        setSelection(editor, nextPath, select)
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
) {
  editor.apply({type: 'insert_node', path, node})
  if (select !== 'none') {
    setSelection(editor, path, select)
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
  editor.apply({type: 'remove_node', path: nodePath, node})
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

  editor.apply({type: 'insert_node', path: blockPath, node: newBlock})
  removeNodeAt(editor, nextPath(blockPath))

  if (select === 'none' && !hadSelection) {
    return
  }

  const point =
    select === 'end'
      ? editorEnd(editor, blockPath)
      : editorStart(editor, blockPath)

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
  for (let i = end.path[1]! - 1; i > start.path[1]!; i--) {
    removeNodeAt(editor, [...blockPath, i])
  }

  // Remove from beginning of end node
  const newEndPath: Path = [...blockPath, start.path[1]! + 1]
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
      for (
        let i = startBlockEntry.node.children.length - 1;
        i > start.path[1]!;
        i--
      ) {
        removeNodeAt(editor, [...startBlockPath, i])
      }
    }
  }

  // Remove all blocks between start and end
  for (let i = end.path[0]! - 1; i > start.path[0]!; i--) {
    removeNodeAt(editor, [i])
  }

  // Remove from beginning of end block to end position
  const adjustedEndBlockPath: Path = [start.path[0]! + 1]
  if (end.path.length > 1) {
    // Remove nodes before end position
    for (let i = 0; i < end.path[1]!; i++) {
      removeNodeAt(editor, [...adjustedEndBlockPath, 0])
    }

    // Remove text from end node
    const endNodePath = [...adjustedEndBlockPath, 0]
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
  const [start, end] = rangeEdges(range)

  if (start.path[0] === end.path[0]) {
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
) {
  if (!isTextBlock({schema: editor.schema}, block)) {
    return
  }

  // Split the text node at the insertion point if needed
  if (at.offset > 0) {
    const textNodeEntry = getSpanNode(editor, at.path)

    if (textNodeEntry) {
      const {text: _, ...properties} = textNodeEntry.node

      applySplitNode(editor, at.path, at.offset, properties)
    }
  }

  // Insert each child as a node
  const parent = parentPath(at.path)
  let insertIndex = at.path[at.path.length - 1]! + (at.offset > 0 ? 1 : 0)

  for (const child of block.children) {
    const childPath = [...parent, insertIndex]

    editor.apply({type: 'insert_node', path: childPath, node: child})
    insertIndex++
  }
}
