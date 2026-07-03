import {createKeyboardShortcut} from '@portabletext/keyboard-shortcuts'
import {defaultKeyboardShortcuts} from '../editor/default-keyboard-shortcuts'
import type {Path} from '../engine/interfaces/path'
import {pathEquals} from '../engine/path/path-equals'
import {createPlaceholderBlock} from '../internal-utils/create-placeholder-block'
import {getEnclosingContainer} from '../schema/get-enclosing-container'
import {isEditableContainer} from '../schema/is-editable-container'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {getLastBlock} from '../selectors/selector.get-last-block'
import {isAtTheEndOfBlock} from '../selectors/selector.is-at-the-end-of-block'
import {isAtTheStartOfBlock} from '../selectors/selector.is-at-the-start-of-block'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import {getAncestor} from '../traversal/get-ancestor'
import {getEnclosingBlock} from '../traversal/get-enclosing-block'
import {getLeaf} from '../traversal/get-leaf'
import {getSibling} from '../traversal/get-sibling'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

/**
 * Escape an editable container when arrow navigation has nowhere to go.
 *
 * At the start of the first block inside a container (ArrowUp) or the end
 * of the last block (ArrowDown), browsers rendering `<table>`-based
 * containers move the DOM caret outside the container element. When the
 * container has a sibling at its parent level, the browser's native
 * navigation lands correctly in that sibling and the engine picks it up. But
 * when no sibling exists, the caret escapes into a DOM position that
 * doesn't map back to the model, and the next keystroke produces orphan
 * text nodes.
 *
 * These behaviors only fire in that dead-end case. A bare arrow escapes
 * the way block objects do: a placeholder block gets inserted beyond the
 * container and receives the caret. Modified arrows (selection extension)
 * and dead ends without an escape target just suppress the native event to
 * keep the caret in place. All other caret movement inside containers is
 * left to the browser.
 */
const anyArrowDown = createKeyboardShortcut({
  default: [{key: 'ArrowDown'}],
})
const anyArrowUp = createKeyboardShortcut({
  default: [{key: 'ArrowUp'}],
})

const arrowDownOutOfContainer = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    if (
      !anyArrowDown.guard(event.originEvent) ||
      !isAtContainerDeadEnd(snapshot, 'end')
    ) {
      return false
    }
    return {escapeTarget: arrowEscapeTarget(snapshot, event.originEvent, 'end')}
  },
  actions: [
    ({snapshot}, {escapeTarget}) =>
      escapeTarget ? [escapeAction(snapshot, escapeTarget, 'after')] : [],
  ],
})

const arrowUpOutOfContainer = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    if (
      !anyArrowUp.guard(event.originEvent) ||
      !isAtContainerDeadEnd(snapshot, 'start')
    ) {
      return false
    }
    return {
      escapeTarget: arrowEscapeTarget(snapshot, event.originEvent, 'start'),
    }
  },
  actions: [
    ({snapshot}, {escapeTarget}) =>
      escapeTarget ? [escapeAction(snapshot, escapeTarget, 'before')] : [],
  ],
})

function arrowEscapeTarget(
  snapshot: Parameters<typeof getFocusTextBlock>[0],
  originEvent: Parameters<typeof defaultKeyboardShortcuts.arrowDown.guard>[0],
  edge: 'start' | 'end',
): Path | undefined {
  const bareArrow =
    edge === 'end'
      ? defaultKeyboardShortcuts.arrowDown.guard(originEvent)
      : defaultKeyboardShortcuts.arrowUp.guard(originEvent)
  if (!bareArrow) {
    return undefined
  }
  const focusTextBlock = getFocusTextBlock(snapshot)
  return focusTextBlock
    ? getEscapeTarget(snapshot, focusTextBlock.path)
    : undefined
}

function escapeAction(
  snapshot: Parameters<typeof createPlaceholderBlock>[0],
  escapeTarget: Path,
  placement: 'before' | 'after',
) {
  return raise({
    type: 'insert.block',
    block: createPlaceholderBlock(snapshot, escapeTarget),
    placement,
    at: {
      anchor: {path: escapeTarget, offset: 0},
      focus: {path: escapeTarget, offset: 0},
    },
    select: 'start',
  })
}

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

  const container = getAncestor(snapshot, focusTextBlock.path, {
    match: (node, path) => isEditableContainer(snapshot, node, path),
  })

  if (!container) {
    return false
  }

  // The DOM caret escapes at the edge of the outermost container (the
  // root-level block the focus sits inside), so the dead end is measured
  // there. At an inner edge (a cell boundary mid-table) native navigation
  // stays inside the container and remains mapped. Scoping this to the
  // nearest container instead would declare every row's first and last
  // cell a dead end.
  const rootSegment = focusTextBlock.path[0]
  if (!rootSegment) {
    return false
  }
  const outerPath: Path = [rootSegment]
  const edgeLeaf = getLeaf(snapshot, outerPath, {edge})
  const edgeBlock = edgeLeaf && getEnclosingBlock(snapshot, edgeLeaf.path)

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

  const sibling = getSibling(snapshot, outerPath, {
    direction: edge === 'end' ? 'next' : 'previous',
  })

  return sibling === undefined
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

    const previousBlock = getSibling(snapshot, focusTextBlock.path, {
      direction: 'previous',
    })
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
  return getAncestor(snapshot, path, {
    match: (node, ancestorPath) => {
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
    },
  })?.path
}

export const coreContainerBehaviors = {
  arrowDownOutOfContainer,
  arrowUpOutOfContainer,
  breakingOutOfContainer,
}
