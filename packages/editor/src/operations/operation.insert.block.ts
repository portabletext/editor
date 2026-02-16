import {isSpan} from '@portabletext/schema'
import {isEqualChildren, isEqualMarks} from '../internal-utils/equality'
import {getFocusChild} from '../internal-utils/slate-utils'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {toSlateBlock} from '../internal-utils/values'
import {
  Editor,
  Element,
  Node,
  Path,
  Point,
  Range,
  Text,
  type Descendant,
} from '../slate'
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
    throw new Error(`Failed to parse block ${JSON.stringify(operation.block)}`)
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

export function insertBlock(options: {
  context: OperationContext
  block: Descendant
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
          value: editor.value,
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
  const start = at ? Range.start(at) : Editor.start(editor, [])
  const end = at ? Range.end(at) : Editor.end(editor, [])

  const [startBlock, startBlockPath] = Array.from(
    Editor.nodes(editor, {
      at: start,
      mode: 'lowest',
      match: (node, path) =>
        Element.isElement(node) && path.length <= start.path.length,
    }),
  ).at(0) ?? [undefined, undefined]
  let [endBlock, endBlockPath] = Array.from(
    Editor.nodes(editor, {
      at: end,
      mode: 'lowest',
      match: (node, path) =>
        Element.isElement(node) && path.length <= end.path.length,
    }),
  ).at(0) ?? [undefined, undefined]

  if (!startBlock || !startBlockPath || !endBlock || !endBlockPath) {
    throw new Error('Unable to insert block without a start and end block')
  }

  if (placement === 'before') {
    insertNodeAt(editor, startBlockPath, block, select)
    return
  }

  if (placement === 'after') {
    insertNodeAt(editor, Path.next(endBlockPath), block, select)
    return
  }

  if (!at) {
    if (isEmptyTextBlock(context, endBlock)) {
      replaceEmptyTextBlock(editor, endBlockPath, block, select)
      return
    }

    if (editor.isTextBlock(block) && editor.isTextBlock(endBlock)) {
      const selectionBefore = Editor.end(editor, endBlockPath)
      insertTextBlockFragment(editor, block, selectionBefore)

      if (select === 'start') {
        setSelectionToPoint(editor, selectionBefore)
      } else if (select === 'none') {
        clearSelection(editor)
      }
      return
    }

    insertNodeAt(editor, Path.next(endBlockPath), block, select)
    return
  }

  if (Range.isExpanded(at) && !editor.isTextBlock(block)) {
    const atBeforeDelete = Editor.rangeRef(editor, at, {affinity: 'inward'})

    // Remember if the selection started at the beginning of the block
    const start = Range.start(at)
    const startBlock = Node.get(editor, [start.path[0]!])
    const startOfBlock = Editor.start(editor, [start.path[0]!])
    const isAtStartOfBlock =
      Element.isElement(startBlock) && Point.equals(start, startOfBlock)

    // Delete the expanded range
    deleteExpandedRange(editor, at)

    const atAfterDelete = atBeforeDelete.unref() ?? editor.selection

    const atBeforeInsert = atAfterDelete
      ? Editor.rangeRef(editor, atAfterDelete, {affinity: 'inward'})
      : undefined

    // Insert the block at the position after delete
    if (atAfterDelete) {
      // If selection was at start of block, insert before; otherwise insert after
      const insertPath: Path = isAtStartOfBlock
        ? [atAfterDelete.anchor.path[0]!]
        : [atAfterDelete.anchor.path[0]! + 1]
      editor.apply({type: 'insert_node', path: insertPath, node: block})

      if (select !== 'none') {
        const point = Editor.start(editor, insertPath)
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
    if (!editor.isTextBlock(block) && atAfterDelete) {
      // If we inserted before (isAtStartOfBlock), check the block that was pushed down
      // Otherwise, check the block before the insertion
      const emptyBlockPath: Path = isAtStartOfBlock
        ? [atAfterDelete.anchor.path[0]! + 1]
        : [atAfterDelete.anchor.path[0]!]
      try {
        const potentiallyEmptyBlock = Node.get(editor, emptyBlockPath)
        if (
          Element.isElement(potentiallyEmptyBlock) &&
          isEmptyTextBlock(context, potentiallyEmptyBlock)
        ) {
          editor.apply({
            type: 'remove_node',
            path: emptyBlockPath,
            node: potentiallyEmptyBlock,
          })
        }
      } catch {
        // Block doesn't exist, nothing to remove
      }
    }

    return
  }

  // Handle collapsed selection with block object insertion in the middle of a text block
  if (
    !editor.isTextBlock(block) &&
    editor.isTextBlock(endBlock) &&
    !Range.isExpanded(at)
  ) {
    const selectionPoint = Range.start(at)
    const blockPath: Path = [selectionPoint.path[0]!]
    const blockStartPoint = Editor.start(editor, blockPath)
    const blockEndPoint = Editor.end(editor, blockPath)

    // Check if we're in the middle of the block (not at start or end)
    const isAtBlockStart = Point.equals(selectionPoint, blockStartPoint)
    const isAtBlockEnd = Point.equals(selectionPoint, blockEndPoint)

    if (!isAtBlockStart && !isAtBlockEnd) {
      // We need to split the block at the selection point
      const currentBlock = Node.get(editor, blockPath) as Element

      // Find the child index and offset within that child
      const childIndex = selectionPoint.path[1]!
      const childOffset = selectionPoint.offset

      // Split the text node at the offset if needed
      if (childOffset > 0) {
        const textNode = Node.get(editor, selectionPoint.path) as Text
        if (childOffset < textNode.text.length) {
          const {text: _, ...properties} = textNode
          editor.apply({
            type: 'split_node',
            path: selectionPoint.path,
            position: childOffset,
            properties,
          })
        }
      }

      // Now split the block itself
      const splitAtIndex = childOffset > 0 ? childIndex + 1 : childIndex
      const {children: _, ...blockProperties} = currentBlock
      editor.apply({
        type: 'split_node',
        path: blockPath,
        position: splitAtIndex,
        properties: blockProperties,
      })

      // Insert the block object between the two split blocks
      const insertPath: Path = [blockPath[0]! + 1]
      editor.apply({type: 'insert_node', path: insertPath, node: block})

      // Handle selection based on select parameter
      if (select === 'none') {
        // Restore selection to end of first block (where the user was typing)
        const firstBlockEndPoint = Editor.end(editor, blockPath)
        editor.apply({
          type: 'set_selection',
          properties: editor.selection,
          newProperties: {
            anchor: firstBlockEndPoint,
            focus: firstBlockEndPoint,
          },
        })
      } else if (select === 'start') {
        const point = Editor.start(editor, insertPath)
        editor.apply({
          type: 'set_selection',
          properties: editor.selection,
          newProperties: {anchor: point, focus: point},
        })
      } else if (select === 'end') {
        const point = Editor.end(editor, insertPath)
        editor.apply({
          type: 'set_selection',
          properties: editor.selection,
          newProperties: {anchor: point, focus: point},
        })
      }

      return
    }
  }

  if (editor.isTextBlock(endBlock) && editor.isTextBlock(block)) {
    let selectionStartPoint = Range.start(at)
    let wasCrossBlockDeletion = false

    // If there's an expanded selection, delete it first
    if (Range.isExpanded(at)) {
      const [start, end] = Range.edges(at)
      const isCrossBlock = start.path[0] !== end.path[0]

      deleteExpandedRange(editor, at)

      // For cross-block deletion, set selection to the merge point
      if (isCrossBlock) {
        wasCrossBlockDeletion = true
        const startBlockPath: Path = [start.path[0]!]
        const mergedBlock = Node.get(editor, startBlockPath) as Element
        if (editor.isTextBlock(mergedBlock)) {
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
      const [newEndBlock, newEndBlockPath] = Array.from(
        Editor.nodes(editor, {
          at: Editor.end(editor, []),
          mode: 'lowest',
          match: (node, path) => Element.isElement(node) && path.length === 1,
        }),
      ).at(-1) ?? [undefined, undefined]

      if (newEndBlock && newEndBlockPath && Element.isElement(newEndBlock)) {
        endBlock = newEndBlock
        endBlockPath = newEndBlockPath
      }
    }

    // After potential reassignment, verify endBlock is still a text block
    if (!editor.isTextBlock(endBlock)) {
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
    const endBlockNode = Node.get(editor, endBlockPath)

    if (Element.isElement(endBlockNode) && editor.isTextBlock(endBlockNode)) {
      const properties: Partial<Element> = {
        markDefs: endBlockNode.markDefs,
      }
      const newProperties: Partial<Element> = {
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
    const adjustedBlock = !isEqualChildren(block.children, adjustedChildren)
      ? {
          ...block,
          children: adjustedChildren as Descendant[],
        }
      : block

    if (select === 'end') {
      const insertAt = editor.selection
        ? Range.end(editor.selection)
        : Editor.end(editor, endBlockPath)

      insertTextBlockFragment(editor, adjustedBlock, insertAt)

      return
    }

    // Use selectionStartPoint (updated after any deletion) instead of stale Range.start(at)
    insertTextBlockFragment(editor, adjustedBlock, selectionStartPoint)

    if (select === 'start') {
      setSelectionToPoint(editor, selectionStartPoint)
    } else if (select === 'none') {
      // For cross-block deletion, always set to insertion point
      // Otherwise, only set if not at block start (to keep cursor at end of inserted content)
      if (wasCrossBlockDeletion) {
        setSelectionToPoint(editor, selectionStartPoint)
      } else {
        const endBlockStartPoint = Editor.start(editor, endBlockPath)
        if (!Point.equals(selectionStartPoint, endBlockStartPoint)) {
          setSelectionToPoint(editor, selectionStartPoint)
        }
      }
    }
    // For 'end', selection is already at the right place after insertTextBlockFragment
  } else {
    // Inserting block object (not text block) into an existing block
    if (!editor.isTextBlock(endBlock)) {
      // End block is not a text block - just insert after it
      insertNodeAt(editor, [endBlockPath[0]! + 1], block, select)
      return
    }

    const endBlockStartPoint = Editor.start(editor, endBlockPath)
    const endBlockEndPoint = Editor.end(editor, endBlockPath)
    const selectionStartPoint = Range.start(at)
    const selectionEndPoint = Range.end(at)

    // Collapsed selection at start of block - insert before
    if (
      Range.isCollapsed(at) &&
      Point.equals(selectionStartPoint, endBlockStartPoint)
    ) {
      editor.apply({type: 'insert_node', path: endBlockPath, node: block})
      if (select !== 'none') {
        setSelection(editor, endBlockPath, 'start')
      }
      if (isEmptyTextBlock(context, endBlock)) {
        removeNodeAt(editor, Path.next(endBlockPath))
      }
      return
    }

    // Collapsed selection at end of block - insert after
    if (
      Range.isCollapsed(at) &&
      Point.equals(selectionEndPoint, endBlockEndPoint)
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
      Range.isExpanded(at) &&
      Point.equals(selectionStartPoint, endBlockStartPoint) &&
      Point.equals(selectionEndPoint, endBlockEndPoint)
    ) {
      editor.apply({type: 'insert_node', path: endBlockPath, node: block})
      removeNodeAt(editor, Path.next(endBlockPath))
      if (select !== 'none') {
        setSelection(editor, endBlockPath, select)
      }
      return
    }

    // Expanded selection starting at block start - delete prefix and insert
    if (
      Range.isExpanded(at) &&
      Point.equals(selectionStartPoint, endBlockStartPoint)
    ) {
      const [, end] = Range.edges(at)

      // Delete text in end node
      const endNode = Node.get(editor, end.path) as Text
      if (end.offset > 0) {
        editor.apply({
          type: 'remove_text',
          path: end.path,
          offset: 0,
          text: endNode.text.slice(0, end.offset),
        })
      }

      // Remove nodes before end
      for (let i = end.path[1]! - 1; i >= 0; i--) {
        removeNodeAt(editor, [...endBlockPath, i])
      }

      insertTextBlockFragment(editor, block, Editor.start(editor, endBlockPath))

      if (select !== 'none') {
        setSelection(editor, endBlockPath, select)
      }
      return
    }

    // Expanded selection ending at block end - delete suffix and insert
    if (
      Range.isExpanded(at) &&
      Point.equals(selectionEndPoint, endBlockEndPoint)
    ) {
      const [start] = Range.edges(at)

      // Remove nodes after start
      const blockNode = Node.get(editor, endBlockPath) as Element
      for (let i = blockNode.children.length - 1; i > start.path[1]!; i--) {
        removeNodeAt(editor, [...endBlockPath, i])
      }

      // Delete text from start node
      const startNode = Node.get(editor, start.path) as Text
      if (start.offset < startNode.text.length) {
        editor.apply({
          type: 'remove_text',
          path: start.path,
          offset: start.offset,
          text: startNode.text.slice(start.offset),
        })
      }

      insertTextBlockFragment(editor, block, start)

      if (select !== 'none') {
        setSelection(editor, Path.next(endBlockPath), select)
      }
      return
    }

    // General case: selection in the middle of the block
    const [focusChild] = getFocusChild({editor})

    if (focusChild && editor.isTextSpan(focusChild)) {
      const startPoint = Range.start(at)

      if (editor.isTextBlock(block)) {
        // Inserting text block: split the text node and insert fragment
        const nodeToSplit = Node.get(editor, startPoint.path)
        if (Text.isText(nodeToSplit)) {
          const {text: _, ...properties} = nodeToSplit
          editor.apply({
            type: 'split_node',
            path: startPoint.path,
            position: startPoint.offset,
            properties,
          })
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
        const cursorPositionRef = Editor.pointRef(editor, startPoint, {
          affinity: 'backward',
        })

        // Create a path ref to track the first block's path as it changes
        const blockPath: Path = [currentPath[0]!]
        const firstBlockPathRef = Editor.pathRef(editor, blockPath)

        // Split text node first
        const textNode = Node.get(editor, currentPath)
        if (
          Text.isText(textNode) &&
          currentOffset > 0 &&
          currentOffset < textNode.text.length
        ) {
          const {text: _, ...properties} = textNode
          editor.apply({
            type: 'split_node',
            path: currentPath,
            position: currentOffset,
            properties,
          })
          currentPath = Path.next(currentPath)
          currentOffset = 0
        }

        // Split the block, preserving block properties
        const splitAtIndex =
          currentOffset > 0 ? currentPath[1]! + 1 : currentPath[1]!
        const blockToSplit = Node.get(editor, blockPath)

        if (
          splitAtIndex < (blockToSplit as Element).children.length &&
          Element.isElement(blockToSplit)
        ) {
          // Get the properties to preserve in the split
          const {children: _, ...blockProperties} = blockToSplit
          editor.apply({
            type: 'split_node',
            path: blockPath,
            position: splitAtIndex,
            properties: blockProperties,
          })
        }

        // Get the current path of the first block after splits
        const currentFirstBlockPath = firstBlockPathRef.unref()

        // Insert block object between the split blocks
        const insertPath: Path = currentFirstBlockPath
          ? [currentFirstBlockPath[0]! + 1]
          : [blockPath[0]! + 1]
        editor.apply({type: 'insert_node', path: insertPath, node: block})

        if (select === 'start' || select === 'end') {
          const point = Editor.start(editor, insertPath)
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
    position === 'start' ? Editor.start(editor, path) : Editor.end(editor, path)
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
  node: Descendant,
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
  const node = Node.get(editor, path)
  editor.apply({type: 'remove_node', path, node})
}

/**
 * Replaces an empty text block with a new block and handles selection.
 */
function replaceEmptyTextBlock(
  editor: PortableTextSlateEditor,
  blockPath: Path,
  newBlock: Descendant,
  select: 'start' | 'end' | 'none',
) {
  const hadSelection = editor.selection !== null

  editor.apply({type: 'insert_node', path: blockPath, node: newBlock})
  removeNodeAt(editor, Path.next(blockPath))

  if (select === 'none' && !hadSelection) {
    return
  }

  const point =
    select === 'end'
      ? Editor.end(editor, blockPath)
      : Editor.start(editor, blockPath)

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

  if (Path.equals(start.path, end.path)) {
    // Same text node - simple text removal
    const text = Node.get(editor, start.path) as Text
    const textToRemove = text.text.slice(start.offset, end.offset)
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
  const startNode = Node.get(editor, start.path) as Text
  if (start.offset < startNode.text.length) {
    const textToRemove = startNode.text.slice(start.offset)
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
  const endNode = Node.get(editor, newEndPath) as Text
  if (end.offset > 0) {
    const textToRemove = endNode.text.slice(0, end.offset)
    editor.apply({
      type: 'remove_text',
      path: newEndPath,
      offset: 0,
      text: textToRemove,
    })
  }

  // Merge adjacent text nodes
  const startNodeAfter = Node.get(editor, start.path)
  const endNodeAfter = Node.get(editor, newEndPath)
  if (Text.isText(startNodeAfter) && Text.isText(endNodeAfter)) {
    const {text: _, ...properties} = endNodeAfter
    editor.apply({
      type: 'merge_node',
      path: newEndPath,
      position: startNodeAfter.text.length,
      properties,
    })
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
    const startNode = Node.get(editor, start.path) as Text
    if (start.offset < startNode.text.length) {
      const textToRemove = startNode.text.slice(start.offset)
      editor.apply({
        type: 'remove_text',
        path: start.path,
        offset: start.offset,
        text: textToRemove,
      })
    }

    // Remove remaining nodes in start block
    const startBlock = Node.get(editor, startBlockPath) as Element
    for (let i = startBlock.children.length - 1; i > start.path[1]!; i--) {
      removeNodeAt(editor, [...startBlockPath, i])
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
    const endNode = Node.get(editor, endNodePath) as Text
    if (end.offset > 0) {
      const textToRemove = endNode.text.slice(0, end.offset)
      editor.apply({
        type: 'remove_text',
        path: endNodePath,
        offset: 0,
        text: textToRemove,
      })
    }
  }

  // Merge the blocks if both are text blocks
  const startBlock = Node.get(editor, startBlockPath) as Element
  const endBlock = Node.get(editor, adjustedEndBlockPath) as Element
  if (editor.isTextBlock(startBlock) && editor.isTextBlock(endBlock)) {
    const {children: _, ...properties} = endBlock
    editor.apply({
      type: 'merge_node',
      path: adjustedEndBlockPath,
      position: startBlock.children.length,
      properties,
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
  const [start, end] = Range.edges(range)

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
  block: Descendant,
  at: Point,
) {
  if (!Element.isElement(block) || !editor.isTextBlock(block)) {
    return
  }

  // Split the text node at the insertion point if needed
  if (at.offset > 0) {
    const textNode = Node.get(editor, at.path)

    if (Text.isText(textNode)) {
      const {text: _, ...properties} = textNode

      editor.apply({
        type: 'split_node',
        path: at.path,
        position: at.offset,
        properties,
      })
    }
  }

  // Insert each child as a node
  const parentPath = Path.parent(at.path)
  let insertIndex = at.path[at.path.length - 1]! + (at.offset > 0 ? 1 : 0)

  for (const child of block.children) {
    const childPath = [...parentPath, insertIndex]

    editor.apply({type: 'insert_node', path: childPath, node: child})
    insertIndex++
  }
}
