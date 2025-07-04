import {getCompoundClientRect} from '../internal-utils/compound-client-rect'
import {getDragSelection} from '../internal-utils/drag-selection'
import * as selectors from '../selectors'
import {effect, forward, raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

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
      const selectingEntireBlocks = selectors.isSelectingEntireBlocks({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: dragSelection,
        },
      })
      const draggedDomNodes = {
        blockNodes: dom.getBlockNodes({
          ...snapshot,
          context: {
            ...snapshot.context,
            selection: dragSelection,
          },
        }),
        childNodes: dom.getChildNodes({
          ...snapshot,
          context: {
            ...snapshot.context,
            selection: dragSelection,
          },
        }),
      }

      return {
        dragSelection,
        draggedDomNodes,
        selectingEntireBlocks,
      }
    },
    actions: [
      (
        {dom, event},
        {dragSelection, draggedDomNodes, selectingEntireBlocks},
      ) => {
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
              raise({
                type: 'select',
                at: dragSelection,
              }),
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
              raise({
                type: 'select',
                at: dragSelection,
              }),
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
            raise({
              type: 'select',
              at: dragSelection,
            }),
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
        ? selectors.isOverlappingSelection(event.position.selection)({
            ...snapshot,
            context: {
              ...snapshot.context,
              selection: dragOrigin.selection,
            },
          })
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
        ? selectors.isOverlappingSelection(dropPosition)({
            ...snapshot,
            context: {
              ...snapshot.context,
              selection: dragOrigin.selection,
            },
          })
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
        ? selectors.isOverlappingSelection(dropPosition)({
            ...snapshot,
            context: {
              ...snapshot.context,
              selection: dragSelection,
            },
          })
        : false

      const draggingEntireBlocks = selectors.isSelectingEntireBlocks({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: dragSelection,
        },
      })

      const draggedBlocks = selectors.getSelectedBlocks({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: dragSelection,
        },
      })

      if (!droppingOnDragOrigin) {
        return {
          dropPosition,
          draggingEntireBlocks,
          draggedBlocks,
          dragOrigin,
          originEvent: event.originEvent,
        }
      }

      return false
    },
    actions: [
      (
        {event},
        {
          draggingEntireBlocks,
          draggedBlocks,
          dragOrigin,
          dropPosition,
          originEvent,
        },
      ) => [
        raise({
          type: 'select',
          at: dropPosition,
        }),
        ...(draggingEntireBlocks
          ? draggedBlocks.map((block) =>
              raise({
                type: 'delete.block',
                at: block.path,
              }),
            )
          : [
              raise({
                type: 'delete',
                at: dragOrigin.selection,
              }),
            ]),
        raise({
          type: 'insert.blocks',
          blocks: event.data,
          placement: draggingEntireBlocks
            ? originEvent.position.block === 'start'
              ? 'before'
              : originEvent.position.block === 'end'
                ? 'after'
                : 'auto'
            : 'auto',
        }),
      ],
    ],
  }),
]
