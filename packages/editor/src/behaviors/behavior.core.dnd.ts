import type {EditorSnapshot} from '../editor/editor-snapshot'
import {isAncestorPath} from '../engine/path/is-ancestor-path'
import {comparePoints} from '../engine/point/compare-points'
import {isCollapsedRange} from '../engine/range/is-collapsed-range'
import {rangeEdges} from '../engine/range/range-edges'
import {getCompoundClientRect} from '../internal-utils/compound-client-rect'
import {getDragSelection} from '../selectors/drag-selection'
import {getFocusInlineObject} from '../selectors/selector.get-focus-inline-object'
import {getFragment} from '../selectors/selector.get-fragment'
import {isOverlappingSelection} from '../selectors/selector.is-overlapping-selection'
import {isSelectingEntireBlocks} from '../selectors/selector.is-selecting-entire-blocks'
import type {EditorSelection} from '../types/editor'
import {effect, forward, raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'
import {fitBlocksToDestination} from './fit-blocks-to-destination'

/**
 * Self-drop suppression: returns true when the drop position lands inside the
 * drag origin in a way that would make the drop a no-op.
 *
 * Two expanded selections that only touch at a single endpoint are not treated
 * as a self-drop — the drop position covers an adjacent block (typical when
 * dragging a block-object onto the next block via the expanded fallback in
 * `getEventPosition`), and the user genuinely wants the drop to happen.
 *
 * Chrome drags emit a collapsed selection pointing AT the dragged container.
 * A drop position whose path descends into that container is dropping the
 * container into itself; suppress it.
 */
function isDropTargetingDragOrigin(
  dropSelection: NonNullable<EditorSelection>,
  dragOriginSelection: NonNullable<EditorSelection>,
  snapshot: EditorSnapshot,
): boolean {
  if (isCollapsedRange(dragOriginSelection)) {
    const originPath = dragOriginSelection.anchor.path
    if (
      isAncestorPath(originPath, dropSelection.anchor.path) ||
      isAncestorPath(originPath, dropSelection.focus.path)
    ) {
      return true
    }
  }

  const overlapping = isOverlappingSelection(dropSelection)({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: dragOriginSelection,
    },
  })

  if (!overlapping) {
    return false
  }

  if (
    isCollapsedRange(dropSelection) ||
    isCollapsedRange(dragOriginSelection)
  ) {
    return true
  }

  const root = {value: snapshot.context.value}
  const [startA, endA] = rangeEdges(dropSelection, root)
  const [startB, endB] = rangeEdges(dragOriginSelection, root)

  if (
    comparePoints(endA, startB, root) === 0 ||
    comparePoints(endB, startA, root) === 0
  ) {
    return false
  }

  return true
}

export const coreDndBehaviors = [
  /**
   * Core Behavior that:
   * 1. Calculates and selects a "drag selection"
   * 2. Constructs and sets a drag ghost element
   * 3. Forwards the dragstart event
   */
  defineBehavior({
    on: 'drag.dragstart',
    guard: ({snapshot, dom, event}) => {
      const dragSelection = getDragSelection({
        snapshot,
        eventSelection: event.position.selection,
      })
      const selectingEntireBlocks = isSelectingEntireBlocks({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: dragSelection,
        },
      })
      const dragSnapshot = {
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: dragSelection,
        },
      }
      const draggedDomNodes = {
        blockNodes: dom.getBlockNodes(dragSnapshot),
        childNodes: dom.getChildNodes(dragSnapshot),
      }

      return {
        draggedDomNodes,
        selectingEntireBlocks,
      }
    },
    actions: [
      ({dom, event}, {draggedDomNodes, selectingEntireBlocks}) => {
        const dragGhost = document.createElement('div')

        if (selectingEntireBlocks) {
          // Clone the DOM Nodes so they won't be visually clipped by scroll-containers etc.
          const clonedBlockNodes = draggedDomNodes.blockNodes.map((node) =>
            node.cloneNode(true),
          )

          for (const block of clonedBlockNodes) {
            if (block instanceof HTMLElement) {
              block.style.position = 'relative'
            }
            dragGhost.appendChild(block)
          }

          // A custom drag ghost element can be configured using this data attribute
          const customGhost = dragGhost.querySelector(
            '[data-pt-drag-ghost-element]',
          )
          if (customGhost) {
            dragGhost.replaceChildren(customGhost)
          }

          // Setting the `data-dragged` attribute so the consumer can style the element while it’s dragged
          dragGhost.setAttribute('data-dragged', '')

          dragGhost.style.position = 'absolute'
          dragGhost.style.left = '-99999px'
          dragGhost.style.boxSizing = 'border-box'
          document.body.appendChild(dragGhost)

          if (customGhost) {
            const customGhostRect = customGhost.getBoundingClientRect()
            const x = event.originEvent.clientX - customGhostRect.left
            const y = event.originEvent.clientY - customGhostRect.top
            dragGhost.style.width = `${customGhostRect.width}px`
            dragGhost.style.height = `${customGhostRect.height}px`

            return [
              effect(() => {
                dom.setDragGhost({
                  event,
                  ghost: {
                    element: dragGhost,
                    x,
                    y,
                  },
                })
              }),
              forward(event),
            ]
          } else {
            const blocksDomRect = getCompoundClientRect(
              draggedDomNodes.blockNodes,
            )
            const x = event.originEvent.clientX - blocksDomRect.left
            const y = event.originEvent.clientY - blocksDomRect.top
            dragGhost.style.width = `${blocksDomRect.width}px`
            dragGhost.style.height = `${blocksDomRect.height}px`

            return [
              effect(() => {
                dom.setDragGhost({
                  event,
                  ghost: {element: dragGhost, x, y},
                })
              }),
              forward(event),
            ]
          }
        } else {
          const clonedChildNodes = draggedDomNodes.childNodes.map((node) =>
            node.cloneNode(true),
          )

          for (const child of clonedChildNodes) {
            dragGhost.appendChild(child)
          }

          dragGhost.style.position = 'absolute'
          dragGhost.style.left = '-99999px'
          dragGhost.style.boxSizing = 'border-box'
          document.body.appendChild(dragGhost)

          const childrenDomRect = getCompoundClientRect(
            draggedDomNodes.childNodes,
          )
          const x = event.originEvent.clientX - childrenDomRect.left
          const y = event.originEvent.clientY - childrenDomRect.top
          dragGhost.style.width = `${childrenDomRect.width}px`
          dragGhost.style.height = `${childrenDomRect.height}px`

          return [
            effect(() => {
              dom.setDragGhost({
                event,
                ghost: {element: dragGhost, x, y},
              })
            }),
            forward(event),
          ]
        }
      },
    ],
  }),

  /**
   * When dragging over the drag origin, we don't want to show the caret in the
   * text.
   */
  defineBehavior({
    on: 'drag.dragover',
    guard: ({snapshot, event}) => {
      const dragOrigin = event.dragOrigin
      const draggingOverDragOrigin = dragOrigin
        ? isDropTargetingDragOrigin(
            event.position.selection,
            dragOrigin.selection,
            snapshot,
          )
        : false

      return draggingOverDragOrigin
    },
    actions: [],
  }),

  /**
   * If the drop position overlaps the drag origin, then the event should be
   * cancelled.
   */
  defineBehavior({
    on: 'drag.drop',
    guard: ({snapshot, event}) => {
      const dragOrigin = event.dragOrigin
      const dropPosition = event.position.selection
      const droppingOnDragOrigin = dragOrigin
        ? isDropTargetingDragOrigin(
            dropPosition,
            dragOrigin.selection,
            snapshot,
          )
        : false
      return droppingOnDragOrigin
    },
    actions: [],
  }),
  /**
   * If we drop and have access to a drag origin, then we can deserialize
   * without creating a new selection.
   */
  defineBehavior({
    on: 'drag.drop',
    guard: ({event}) => event.dragOrigin !== undefined,
    actions: [
      ({event}) => [
        raise({
          type: 'deserialize',
          originEvent: event,
        }),
      ],
    ],
  }),
  /**
   * Otherwise, we should to create a new selection.
   */
  defineBehavior({
    on: 'drag.drop',
    actions: [
      ({event}) => [
        raise({
          type: 'select',
          at: event.position.selection,
        }),
        raise({
          type: 'deserialize',
          originEvent: event,
        }),
      ],
    ],
  }),

  /**
   * Core Behavior that uses the drag origin to mimic a move operation during
   * internal dragging.
   */
  defineBehavior({
    on: 'deserialization.success',
    guard: ({snapshot, event}) => {
      if (
        event.originEvent.type !== 'drag.drop' ||
        event.originEvent.dragOrigin === undefined
      ) {
        return false
      }

      const dragOrigin = event.originEvent.dragOrigin
      const dragSelection = getDragSelection({
        eventSelection: dragOrigin.selection,
        snapshot,
      })
      const dropPosition = event.originEvent.position.selection
      const droppingOnDragOrigin = dragOrigin
        ? isDropTargetingDragOrigin(dropPosition, dragSelection, snapshot)
        : false

      const dragSnapshot = {
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: dragSelection,
        },
      }

      const draggingEntireBlocks = isSelectingEntireBlocks(dragSnapshot)

      // A collapsed drag on a single inline object: the moved object keeps its
      // `_key`, so it can be re-selected at the destination after the move. A
      // text-range drag ending on an inline object is excluded by the
      // collapsed-range guard so we don't mistake it for a single-object drag.
      const movedInlineObjectKey =
        !draggingEntireBlocks && isCollapsedRange(dragSelection)
          ? getFocusInlineObject(dragSnapshot)?.node._key
          : undefined

      const draggedNodes = getFragment(dragSnapshot)
      const fittedBlocks = fitBlocksToDestination(
        {
          ...snapshot,
          context: {
            ...snapshot.context,
            selection: dropPosition,
          },
        },
        event.data,
      )

      if (!droppingOnDragOrigin) {
        return {
          dropPosition,
          draggingEntireBlocks,
          draggedNodes,
          dragOrigin,
          originEvent: event.originEvent,
          fittedBlocks,
          movedInlineObjectKey,
        }
      }

      return false
    },
    actions: [
      (
        _,
        {
          draggingEntireBlocks,
          draggedNodes,
          dragOrigin,
          dropPosition,
          originEvent,
          fittedBlocks,
          movedInlineObjectKey,
        },
      ) => {
        // The dropped object lives in the drop position's block, keyed by its
        // preserved `_key`. Re-selecting it keeps the moved inline object
        // selected, mirroring inserting an inline object, instead of leaving
        // the caret on the span that follows it.
        const movedInlineObjectPath = movedInlineObjectKey
          ? [
              ...dropPosition.anchor.path.slice(0, -2),
              'children' as const,
              {_key: movedInlineObjectKey},
            ]
          : undefined
        const movedInlineObjectSelection = movedInlineObjectPath
          ? {
              anchor: {path: movedInlineObjectPath, offset: 0},
              focus: {path: movedInlineObjectPath, offset: 0},
            }
          : undefined
        // Source removal mirrors what the serializer carried: per dragged
        // node for an entire-blocks drag, by text range for a partial drag.
        const deleteEvents = draggingEntireBlocks
          ? draggedNodes.map((entry) =>
              raise({
                type: 'unset',
                at: entry.path,
              }),
            )
          : [
              raise({
                type: 'delete',
                at: dragOrigin.selection,
              }),
            ]

        return [
          raise({
            type: 'select',
            at: dropPosition,
          }),
          ...deleteEvents,
          raise({
            type: 'insert.blocks',
            blocks: fittedBlocks,
            placement: draggingEntireBlocks
              ? originEvent.position.block === 'start'
                ? 'before'
                : originEvent.position.block === 'end'
                  ? 'after'
                  : 'auto'
              : 'auto',
            select: movedInlineObjectSelection ? 'none' : undefined,
          }),
          ...(movedInlineObjectSelection
            ? [raise({type: 'select', at: movedInlineObjectSelection})]
            : []),
        ]
      },
    ],
  }),
]
