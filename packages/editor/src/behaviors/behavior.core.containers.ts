import {getAncestor} from '../node-traversal/get-ancestor'
import {getSibling} from '../node-traversal/get-sibling'
import {isEditableContainer} from '../schema/is-editable-container'
import {getFirstBlock} from '../selectors/selector.get-first-block'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {getLastBlock} from '../selectors/selector.get-last-block'
import {isAtTheEndOfBlock} from '../selectors/selector.is-at-the-end-of-block'
import {isAtTheStartOfBlock} from '../selectors/selector.is-at-the-start-of-block'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import {pathEquals} from '../slate/path/path-equals'
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

  const container = getAncestor(
    snapshot.context,
    focusTextBlock.path,
    (node, path) => isEditableContainer(snapshot.context, node, path),
  )

  if (!container) {
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

  const sibling = getSibling(
    snapshot.context,
    container.path,
    edge === 'end' ? 'next' : 'previous',
  )

  return sibling === undefined
}

export const coreContainerBehaviors = {
  arrowDownOutOfContainer,
  arrowUpOutOfContainer,
}
