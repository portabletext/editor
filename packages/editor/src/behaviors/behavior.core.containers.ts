import {createPlaceholderBlock} from '../internal-utils/create-placeholder-block'
import {getAncestor} from '../node-traversal/get-ancestor'
import {getSibling} from '../node-traversal/get-sibling'
import type {TraversalSnapshot} from '../node-traversal/traversal-snapshot'
import {getEnclosingContainer} from '../schema/get-enclosing-container'
import {isEditableContainer} from '../schema/is-editable-container'
import {getFirstBlock} from '../selectors/selector.get-first-block'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {getLastBlock} from '../selectors/selector.get-last-block'
import {isAtTheEndOfBlock} from '../selectors/selector.is-at-the-end-of-block'
import {isAtTheStartOfBlock} from '../selectors/selector.is-at-the-start-of-block'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import type {Path} from '../slate/interfaces/path'
import {pathEquals} from '../slate/path/path-equals'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

/**
 * Prevent the browser from escaping the caret out of an editable container
 * when there is nowhere to go.
 *
 * At the start of the first block inside a container (ArrowUp) or the end
 * of the last block (ArrowDown), browsers rendering `<table>`-based
 * containers move the DOM caret outside the container element. When the
 * container has a sibling at its parent level, the browser's native
 * navigation lands correctly in that sibling and Slate picks it up. But
 * when no sibling exists, the caret escapes into a DOM position that
 * doesn't map back to the model, and the next keystroke produces orphan
 * text nodes.
 *
 * This behavior only fires in that dead-end case and suppresses the
 * native event to keep the caret in place. All other caret movement
 * inside containers is left to the browser.
 */
const arrowDownOutOfContainer = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) =>
    event.originEvent.key === 'ArrowDown' &&
    isAtContainerDeadEnd(snapshot, 'end'),
  actions: [],
})

const arrowUpOutOfContainer = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) =>
    event.originEvent.key === 'ArrowUp' &&
    isAtContainerDeadEnd(snapshot, 'start'),
  actions: [],
})

function isAtContainerDeadEnd(
  snapshot: Parameters<typeof getFocusTextBlock>[0],
  edge: 'start' | 'end',
): boolean {
  if (!isSelectionCollapsed(snapshot)) {
    return false
  }

  const focusTextBlock = getFocusTextBlock(snapshot)

  if (!focusTextBlock) {
    return false
  }

  const edgeBlock =
    edge === 'end' ? getLastBlock(snapshot) : getFirstBlock(snapshot)

  if (!edgeBlock || !pathEquals(edgeBlock.path, focusTextBlock.path)) {
    return false
  }

  const caretAtEdge =
    edge === 'end'
      ? isAtTheEndOfBlock(focusTextBlock)(snapshot)
      : isAtTheStartOfBlock(focusTextBlock)(snapshot)

  if (!caretAtEdge) {
    return false
  }

  // Walk container ancestors from innermost to outermost. If ANY ancestor
  // has a sibling at the edge direction, the browser can step out of the
  // nested structure naturally - not a dead end. Only when every container
  // ancestor up to the root is at its edge do we suppress the native event.
  let cursorPath: Path | undefined = focusTextBlock.path
  let foundEditableContainer = false
  while (cursorPath !== undefined) {
    const container: {path: Path; node: unknown} | undefined = getAncestor(
      snapshot,
      cursorPath,
      (node, path) => isEditableContainer(snapshot, node, path),
    )
    if (!container) {
      break
    }
    foundEditableContainer = true
    const sibling = getSibling(
      snapshot,
      container.path,
      edge === 'end' ? 'next' : 'previous',
    )
    if (sibling !== undefined) {
      return false
    }
    cursorPath = container.path
  }

  return foundEditableContainer
}

/**
 * Enter at the bottom of an editable container, on an empty trailing line
 * whose previous sibling is also an empty text block, escapes the container
 * by deleting both empty trailing blocks and inserting a fresh text block
 * after the deepest editable container ancestor whose parent accepts a
 * text block.
 */
const breakingOutOfContainer = defineBehavior({
  on: 'insert.break',
  guard: ({snapshot}) => {
    if (!isSelectionCollapsed(snapshot)) {
      return false
    }

    const focusTextBlock = getFocusTextBlock(snapshot)
    if (!focusTextBlock) {
      return false
    }

    const lastBlock = getLastBlock(snapshot)
    if (!lastBlock || !pathEquals(lastBlock.path, focusTextBlock.path)) {
      return false
    }

    if (!isEmptyTextBlock(snapshot.context, focusTextBlock.node)) {
      return false
    }

    const previousBlock = getSibling(snapshot, focusTextBlock.path, 'previous')
    if (
      !previousBlock ||
      !isEmptyTextBlock(snapshot.context, previousBlock.node)
    ) {
      return false
    }

    const escapeAfter = getEscapeTarget(snapshot, focusTextBlock.path)
    if (!escapeAfter) {
      return false
    }

    return {
      focusBlockPath: focusTextBlock.path,
      previousBlockPath: previousBlock.path,
      escapeAfter,
    }
  },
  actions: [
    ({snapshot}, {focusBlockPath, previousBlockPath, escapeAfter}) => [
      raise({type: 'delete.block', at: focusBlockPath}),
      raise({type: 'delete.block', at: previousBlockPath}),
      raise({
        type: 'insert.block',
        block: createPlaceholderBlock(snapshot, escapeAfter),
        placement: 'after',
        at: {
          anchor: {path: escapeAfter, offset: 0},
          focus: {path: escapeAfter, offset: 0},
        },
        select: 'start',
      }),
    ],
  ],
})

/**
 * Find the deepest editable container ancestor whose immediate parent
 * accepts a text block. The new text block is inserted as the next
 * sibling of this container.
 */
function getEscapeTarget(
  snapshot: TraversalSnapshot,
  path: Path,
): Path | undefined {
  return getAncestor(snapshot, path, (node, ancestorPath) => {
    if (!isEditableContainer(snapshot, node, ancestorPath)) {
      return false
    }
    const enclosing = getEnclosingContainer(snapshot, ancestorPath)
    if (!enclosing) {
      // The container is at root level; the editor root accepts text blocks.
      return true
    }
    return enclosing.of.some(
      (member) => member.type === snapshot.context.schema.block.name,
    )
  })?.path
}

export const coreContainerBehaviors = {
  arrowDownOutOfContainer,
  arrowUpOutOfContainer,
  breakingOutOfContainer,
}
