import {isSpan} from '@portabletext/schema'
import {defaultKeyboardShortcuts} from '../editor/default-keyboard-shortcuts'
import {isTextBlockNode} from '../engine/node/is-text-block-node'
import {getEnclosingContainer} from '../schema/get-enclosing-container'
import {getFocusBlockObject} from '../selectors/selector.get-focus-block-object'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import {getFirstChild} from '../traversal/get-first-child'
import {getLastChild} from '../traversal/get-last-child'
import {getLeaf} from '../traversal/get-leaf'
import {getNode} from '../traversal/get-node'
import {getSibling} from '../traversal/get-sibling'
import {isListBlock} from '../utils/parse-blocks'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

const arrowDownOnLonelyBlockObject = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    const isArrowDown = defaultKeyboardShortcuts.arrowDown.guard(
      event.originEvent,
    )

    if (!isArrowDown) {
      return false
    }

    const collapsedSelection = isSelectionCollapsed(snapshot)

    if (!collapsedSelection) {
      return false
    }

    const focusedBlockObject = getFocusBlockObject(snapshot)

    if (!focusedBlockObject) {
      return false
    }

    const nextBlock = getSibling(snapshot, focusedBlockObject.path, {
      direction: 'next',
    })

    return !nextBlock
  },
  actions: [
    ({snapshot}) => [
      raise({
        type: 'insert.block',
        block: {
          _type: snapshot.context.schema.block.name,
        },
        placement: 'after',
      }),
    ],
  ],
})

const arrowUpOnLonelyBlockObject = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    const isArrowUp = defaultKeyboardShortcuts.arrowUp.guard(event.originEvent)

    if (!isArrowUp) {
      return false
    }

    const collapsedSelection = isSelectionCollapsed(snapshot)

    if (!collapsedSelection) {
      return false
    }

    const focusedBlockObject = getFocusBlockObject(snapshot)

    if (!focusedBlockObject) {
      return false
    }

    const previousBlock = getSibling(snapshot, focusedBlockObject.path, {
      direction: 'previous',
    })

    return !previousBlock
  },
  actions: [
    ({snapshot}) => [
      raise({
        type: 'insert.block',
        block: {
          _type: snapshot.context.schema.block.name,
        },
        placement: 'before',
      }),
    ],
  ],
})

const breakingBlockObject = defineBehavior({
  on: 'insert.break',
  guard: ({snapshot}) => {
    const focusedBlockObject = getFocusBlockObject(snapshot)
    const collapsedSelection = isSelectionCollapsed(snapshot)

    return collapsedSelection && focusedBlockObject !== undefined
  },
  actions: [
    ({snapshot}) => [
      raise({
        type: 'insert.block',
        block: {
          _type: snapshot.context.schema.block.name,
        },
        placement: 'after',
      }),
    ],
  ],
})

const clickingAboveLonelyBlockObject = defineBehavior({
  on: 'mouse.click',
  guard: ({snapshot, event}) => {
    if (snapshot.context.readOnly) {
      return false
    }

    if (snapshot.context.selection && !isSelectionCollapsed(snapshot)) {
      return false
    }

    // The position's selection names what was clicked: a leaf for text,
    // the container itself for a click on its own surface. The block the
    // click was beyond is the root block for editor-surface clicks and the
    // clicked container's edge child for container-surface clicks. Clicks
    // on a block's content are neither and never insert.
    const focusPath = event.position.selection.focus.path
    const focusBlock = event.position.isEditor
      ? focusPath.length >= 1
        ? getNode(snapshot, focusPath.slice(0, 1))
        : undefined
      : event.position.isContainer
        ? getFirstChild(snapshot, focusPath)
        : undefined

    if (!focusBlock || isTextBlockNode(snapshot.context, focusBlock.node)) {
      return false
    }

    if (
      event.position.isContainer &&
      !acceptsTextBlock(snapshot, focusBlock.path)
    ) {
      // The placeholder would land inside the clicked container, so the
      // container's array must accept text blocks; a table's rows array
      // does not, and there the click inserts nothing.
      return false
    }

    const previousSibling = getSibling(snapshot, focusBlock.path, {
      direction: 'previous',
    })

    if (
      (event.position.isEditor || event.position.isContainer) &&
      event.position.block === 'start' &&
      !previousSibling
    ) {
      return {blockPath: focusBlock.path}
    }
    return false
  },
  actions: [
    ({snapshot}, {blockPath}) => [
      raise({
        type: 'insert.block',
        block: {
          _type: snapshot.context.schema.block.name,
        },
        placement: 'before',
        at: {
          anchor: {path: blockPath, offset: 0},
          focus: {path: blockPath, offset: 0},
        },
        select: 'start',
      }),
    ],
  ],
})

const clickingBelowLonelyBlockObject = defineBehavior({
  on: 'mouse.click',
  guard: ({snapshot, event}) => {
    if (snapshot.context.readOnly) {
      return false
    }

    if (snapshot.context.selection && !isSelectionCollapsed(snapshot)) {
      return false
    }

    // The position's selection names what was clicked: a leaf for text,
    // the container itself for a click on its own surface. The block the
    // click was beyond is the root block for editor-surface clicks and the
    // clicked container's edge child for container-surface clicks. Clicks
    // on a block's content are neither and never insert.
    const focusPath = event.position.selection.focus.path
    const focusBlock = event.position.isEditor
      ? focusPath.length >= 1
        ? getNode(snapshot, focusPath.slice(0, 1))
        : undefined
      : event.position.isContainer
        ? getLastChild(snapshot, focusPath)
        : undefined

    if (!focusBlock || isTextBlockNode(snapshot.context, focusBlock.node)) {
      return false
    }

    if (
      event.position.isContainer &&
      !acceptsTextBlock(snapshot, focusBlock.path)
    ) {
      // Same rule as clicking above: no valid place for a text block
      // inside the clicked container means no insert.
      return false
    }

    const nextSibling = getSibling(snapshot, focusBlock.path, {
      direction: 'next',
    })

    if (
      (event.position.isEditor || event.position.isContainer) &&
      event.position.block === 'end' &&
      !nextSibling
    ) {
      return {blockPath: focusBlock.path}
    }
    return false
  },
  actions: [
    ({snapshot}, {blockPath}) => [
      raise({
        type: 'insert.block',
        block: {
          _type: snapshot.context.schema.block.name,
        },
        placement: 'after',
        at: {
          anchor: {path: blockPath, offset: 0},
          focus: {path: blockPath, offset: 0},
        },
        select: 'start',
      }),
    ],
  ],
})

/**
 * Whether the position at `path` accepts a text block: the enclosing
 * container's `of` declares the schema's block type, or the path sits at
 * the document root, which always does.
 */
function acceptsTextBlock(
  snapshot: Parameters<typeof getEnclosingContainer>[0],
  path: Parameters<typeof getEnclosingContainer>[1],
): boolean {
  const enclosing = getEnclosingContainer(snapshot, path)
  return (
    !enclosing ||
    enclosing.of.some(
      (member) => member.type === snapshot.context.schema.block.name,
    )
  )
}

const deletingEmptyTextBlockAfterBlockObject = defineBehavior({
  on: 'delete.backward',
  guard: ({snapshot}) => {
    const focusedTextBlock = getFocusTextBlock(snapshot)
    const selectionCollapsed = isSelectionCollapsed(snapshot)

    if (!focusedTextBlock || !selectionCollapsed) {
      return false
    }

    const previousSibling = getSibling(snapshot, focusedTextBlock.path, {
      direction: 'previous',
    })

    if (!previousSibling) {
      return false
    }

    if (isListBlock(snapshot.context, focusedTextBlock.node)) {
      return false
    }

    if (
      isEmptyTextBlock(snapshot.context, focusedTextBlock.node) &&
      !isTextBlockNode(snapshot.context, previousSibling.node)
    ) {
      // Land the caret at the END of the previous sibling's deepest leaf.
      // A span leaf gets the end of its text, anything else (void block-object,
      // inline-object) gets focused at its own path.
      const leaf = getLeaf(snapshot, previousSibling.path, {edge: 'end'})
      const previousEndPoint = leaf
        ? {
            path: leaf.path,
            offset: isSpan(snapshot.context, leaf.node)
              ? leaf.node.text.length
              : 0,
          }
        : {path: previousSibling.path, offset: 0}

      return {focusedTextBlock, previousEndPoint}
    }

    return false
  },
  actions: [
    (_, {focusedTextBlock, previousEndPoint}) => [
      raise({
        type: 'delete.block',
        at: focusedTextBlock.path,
      }),
      raise({
        type: 'select',
        at: {
          anchor: previousEndPoint,
          focus: previousEndPoint,
        },
      }),
    ],
  ],
})

const deletingEmptyTextBlockBeforeBlockObject = defineBehavior({
  on: 'delete.forward',
  guard: ({snapshot}) => {
    const focusedTextBlock = getFocusTextBlock(snapshot)
    const selectionCollapsed = isSelectionCollapsed(snapshot)

    if (!focusedTextBlock || !selectionCollapsed) {
      return false
    }

    const nextSibling = getSibling(snapshot, focusedTextBlock.path, {
      direction: 'next',
    })

    if (!nextSibling) {
      return false
    }

    if (
      isEmptyTextBlock(snapshot.context, focusedTextBlock.node) &&
      !isTextBlockNode(snapshot.context, nextSibling.node)
    ) {
      return {focusedTextBlock, nextSibling}
    }

    return false
  },
  actions: [
    (_, {focusedTextBlock, nextSibling}) => [
      raise({
        type: 'delete.block',
        at: focusedTextBlock.path,
      }),
      raise({
        type: 'select',
        at: {
          anchor: {path: nextSibling.path, offset: 0},
          focus: {path: nextSibling.path, offset: 0},
        },
      }),
    ],
  ],
})

export const coreBlockObjectBehaviors = {
  arrowDownOnLonelyBlockObject,
  arrowUpOnLonelyBlockObject,
  breakingBlockObject,
  clickingAboveLonelyBlockObject,
  clickingBelowLonelyBlockObject,
  deletingEmptyTextBlockAfterBlockObject,
  deletingEmptyTextBlockBeforeBlockObject,
}
