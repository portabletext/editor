import {getAncestor} from '../node-traversal/get-ancestor'
import {getAncestors} from '../node-traversal/get-ancestors'
import {getSibling} from '../node-traversal/get-sibling'
import {getContainerScopedName} from '../schema/get-container-scoped-name'
import {isEditableContainer} from '../schema/is-editable-container'
import {getFirstBlock} from '../selectors/selector.get-first-block'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {getLastBlock} from '../selectors/selector.get-last-block'
import {isAtTheEndOfBlock} from '../selectors/selector.is-at-the-end-of-block'
import {isAtTheStartOfBlock} from '../selectors/selector.is-at-the-start-of-block'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import type {Path} from '../slate/interfaces/path'
import {isObjectNode} from '../slate/node/is-object-node'
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

/**
 * Enter at the bottom of an editable container, on an empty trailing line
 * whose previous sibling is also an empty text block, escapes the container
 * by deleting both trailing empty blocks and creating a new text block as
 * the next sibling of the outermost container that sits between the focus
 * and the nearest ancestor whose child field accepts text blocks.
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

    const innerContainer = getAncestor(
      snapshot.context,
      focusTextBlock.path,
      (node, path) => isEditableContainer(snapshot.context, node, path),
    )
    if (!innerContainer) {
      return false
    }

    const lastBlock = getLastBlock(snapshot)
    if (!lastBlock || !pathEquals(lastBlock.path, focusTextBlock.path)) {
      return false
    }

    if (!isEmptyTextBlock(snapshot.context, focusTextBlock.node)) {
      return false
    }

    const previousBlock = getSibling(
      snapshot.context,
      focusTextBlock.path,
      'previous',
    )
    if (
      !previousBlock ||
      !isEmptyTextBlock(snapshot.context, previousBlock.node)
    ) {
      return false
    }

    const escapeTargetBlock = resolveEscapeTargetBlock(
      snapshot.context,
      focusTextBlock.path,
    )
    if (!escapeTargetBlock) {
      return false
    }

    return {
      focusBlockPath: focusTextBlock.path,
      previousBlockPath: previousBlock.path,
      escapeAfterPath: escapeTargetBlock,
    }
  },
  actions: [
    ({snapshot}, {focusBlockPath, previousBlockPath, escapeAfterPath}) => [
      raise({type: 'delete.block', at: focusBlockPath}),
      raise({type: 'delete.block', at: previousBlockPath}),
      raise({
        type: 'insert.block',
        block: {
          _type: snapshot.context.schema.block.name,
          children: [
            {
              _type: snapshot.context.schema.span.name,
              text: '',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
        placement: 'after',
        at: {
          anchor: {path: escapeAfterPath, offset: 0},
          focus: {path: escapeAfterPath, offset: 0},
        },
        select: 'start',
      }),
    ],
  ],
})

/**
 * Resolve which ancestor block the new text block should be inserted AFTER.
 *
 * Walk editable container ancestors from innermost outward. For each, check
 * whether the NEXT ancestor container (one level out) has a child field that
 * accepts text blocks (`{type: 'block'}`). The first container whose parent
 * accepts text blocks is the one we insert after; the new block lands in
 * its parent container's field.
 *
 * When no ancestor container has a block-accepting parent (e.g. a direct
 * cell with no inner container), return the path of the outermost container,
 * which sits at editor root level.
 */
function resolveEscapeTargetBlock(
  context: Parameters<typeof getAncestors>[0],
  path: Path,
): Path | undefined {
  const containerAncestors: Array<{
    node: Parameters<typeof getContainerScopedName>[1]
    path: Path
  }> = []

  for (const ancestor of getAncestors(context, path)) {
    if (!isObjectNode({schema: context.schema}, ancestor.node)) {
      continue
    }
    const scopedName = getContainerScopedName(
      context,
      ancestor.node,
      ancestor.path,
    )
    if (context.containers.has(scopedName)) {
      containerAncestors.push({node: ancestor.node, path: ancestor.path})
    }
  }

  if (containerAncestors.length === 0) {
    return undefined
  }

  for (let i = 0; i < containerAncestors.length; i++) {
    const current = containerAncestors[i]!
    const outer = containerAncestors[i + 1]

    if (!outer) {
      // No ancestor container beyond this; insert after it (lands at root).
      return current.path
    }

    const outerScopedName = getContainerScopedName(
      context,
      outer.node,
      outer.path,
    )
    const outerContainer = context.containers.get(outerScopedName)
    if (!outerContainer) {
      continue
    }

    const outerAcceptsBlock = outerContainer.field.of.some(
      (member) => member.type === 'block',
    )
    if (outerAcceptsBlock) {
      return current.path
    }
  }

  return undefined
}

export const coreContainerBehaviors = {
  arrowDownOutOfContainer,
  arrowUpOutOfContainer,
  breakingOutOfContainer,
}
