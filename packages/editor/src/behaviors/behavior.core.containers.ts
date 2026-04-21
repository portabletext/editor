import {getAncestor} from '../node-traversal/get-ancestor'
import {getEnclosingBlock} from '../node-traversal/get-enclosing-block'
import {getNodes} from '../node-traversal/get-nodes'
import {getSibling} from '../node-traversal/get-sibling'
import {isBlock} from '../node-traversal/is-block'
import {isEditableContainer} from '../schema/is-editable-container'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {isAtTheEndOfBlock} from '../selectors/selector.is-at-the-end-of-block'
import {isAtTheStartOfBlock} from '../selectors/selector.is-at-the-start-of-block'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import type {Path} from '../slate/interfaces/path'
import {pathEquals} from '../slate/path/path-equals'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

/**
 * Intercept `ArrowUp` at the start of the first block inside an editable
 * container, and `ArrowDown` at the end of the last block. In those two
 * positions, browsers rendering `<table>`-based containers escape the
 * caret out of the DOM element, which subsequently produces orphan text
 * nodes when the user types.
 *
 * When a sibling block exists at the container's parent level (which may
 * itself be inside another container), select the start/end of that
 * sibling — this is the user's "escape the container" intent. When no
 * sibling exists, suppress the native event to keep the caret in place.
 *
 * Every other caret movement inside a container is left to the browser:
 * line-by-line up/down, horizontal navigation within a line, movement to
 * an adjacent line inside the same container — all handled natively.
 */
const arrowDownOutOfContainer = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    if (event.originEvent.key !== 'ArrowDown') {
      return false
    }

    const edge = resolveContainerEdge(snapshot, 'end')

    if (!edge) {
      return false
    }

    return edge
  },
  actions: [
    ({snapshot}, edge) => selectSiblingOrPreventDefault(snapshot, edge, 'next'),
  ],
})

const arrowUpOutOfContainer = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    if (event.originEvent.key !== 'ArrowUp') {
      return false
    }

    const edge = resolveContainerEdge(snapshot, 'start')

    if (!edge) {
      return false
    }

    return edge
  },
  actions: [
    ({snapshot}, edge) =>
      selectSiblingOrPreventDefault(snapshot, edge, 'previous'),
  ],
})

type ContainerEdge = {
  containerPath: Path
}

function resolveContainerEdge(
  snapshot: Parameters<typeof getFocusTextBlock>[0],
  edge: 'start' | 'end',
): ContainerEdge | false {
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
    edge === 'end'
      ? lastBlockIn(
          {...snapshot.context, blockIndexMap: snapshot.blockIndexMap},
          container.path,
        )
      : firstBlockIn(
          {...snapshot.context, blockIndexMap: snapshot.blockIndexMap},
          container.path,
        )

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

  return {containerPath: container.path}
}

function selectSiblingOrPreventDefault(
  snapshot: Parameters<typeof getFocusTextBlock>[0],
  edge: ContainerEdge,
  direction: 'next' | 'previous',
) {
  const sibling = getSibling(snapshot.context, edge.containerPath, direction)

  if (!sibling) {
    return []
  }

  const siblingBlock = getEnclosingBlock(snapshot.context, sibling.path)

  if (!siblingBlock) {
    return []
  }

  const point =
    direction === 'next'
      ? getBlockStartPoint({
          context: snapshot.context,
          block: siblingBlock,
        })
      : getBlockEndPoint({
          context: snapshot.context,
          block: siblingBlock,
        })

  return [
    raise({
      type: 'select',
      at: {anchor: point, focus: point},
    }),
  ]
}

function firstBlockIn(
  context: Parameters<typeof getNodes>[0],
  containerPath: Path,
): {path: Path} | undefined {
  for (const entry of getNodes(context, {
    at: containerPath,
    match: (_node, path) => isBlock(context, path),
  })) {
    if (pathEquals(entry.path, containerPath)) {
      continue
    }
    return entry
  }
  return undefined
}

function lastBlockIn(
  context: Parameters<typeof getNodes>[0],
  containerPath: Path,
): {path: Path} | undefined {
  let last: {path: Path} | undefined
  for (const entry of getNodes(context, {
    at: containerPath,
    match: (_node, path) => isBlock(context, path),
  })) {
    if (pathEquals(entry.path, containerPath)) {
      continue
    }
    last = entry
  }
  return last
}

export const coreContainerBehaviors = {
  arrowDownOutOfContainer,
  arrowUpOutOfContainer,
}
