import {useEditor, type Editor, type EditorSnapshot} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {isTextBlock} from '@portabletext/editor/utils'
import {useActorRef, useSelector} from '@xstate/react'
import React from 'react'
import {assign, fromCallback, setup} from 'xstate'
import {disableListener, type DisableListenerEvent} from './disable-listener'

type ActiveListenerEvent =
  | {
      type: 'set active'
      boundaryElement: Element | undefined
      anchorRef: React.RefObject<Element | null>
      crossOffset: number
    }
  | {
      type: 'set inactive'
    }

const activeListener = fromCallback(
  ({
    input,
    sendBack,
  }: {
    input: {
      editor: Editor
      guard: (snapshot: EditorSnapshot) => boolean
      placement: 'top' | 'bottom' | 'left' | 'right'
    }
    sendBack: (event: ActiveListenerEvent) => void
  }) => {
    return input.editor.on('selection', () => {
      const snapshot = input.editor.getSnapshot()

      if (!input.guard(snapshot)) {
        sendBack({type: 'set inactive'})
        return
      }

      const editorElement = input.editor.dom.getEditorElement()
      const editorRect = editorElement?.getBoundingClientRect()
      const startBlock = selectors.getSelectionStartBlock(snapshot)
      const endBlock = selectors.getSelectionEndBlock(snapshot)

      if (!editorRect || !startBlock || !endBlock) {
        sendBack({type: 'set inactive'})
        return
      }

      if (input.placement === 'top' || input.placement === 'bottom') {
        const element =
          input.placement === 'top'
            ? input.editor.dom.getStartBlockElement(snapshot)
            : input.editor.dom.getEndBlockElement(snapshot)

        if (!element) {
          sendBack({type: 'set inactive'})
          return
        }

        const anchorRef = React.createRef<Element>()
        anchorRef.current = element

        if (startBlock.node._key !== endBlock.node._key) {
          // If the selection spans multiple blocks, then we position the
          // popover relative to the start block with no cross offset applied,
          // since the selection rect is unpredictable.
          sendBack({
            type: 'set active',
            boundaryElement: editorElement,
            anchorRef,
            crossOffset: 0,
          })
          return
        }

        const selectionRect = input.editor.dom.getSelectionRect(snapshot)

        if (!selectionRect) {
          sendBack({type: 'set inactive'})
          return
        }

        const elementRect = element.getBoundingClientRect()
        const halfWidth = elementRect.width / 2
        const offset = elementRect.left + halfWidth

        const halfSelectionWidth = selectionRect.width / 2
        const selectionOffset = selectionRect.left + halfSelectionWidth
        const crossOffset = isTextBlock(snapshot.context, startBlock.node)
          ? selectionOffset - offset
          : 0

        sendBack({
          type: 'set active',
          boundaryElement: editorElement,
          anchorRef,
          crossOffset,
        })
        return
      }

      const startBlockElement = input.editor.dom.getStartBlockElement(snapshot)

      if (!startBlockElement) {
        sendBack({type: 'set inactive'})
        return
      }

      // If the placement is left or right, then we set the start block as the
      // anchor element and apply the cross offset based on the selection rect
      // or the end block rect depending on whether the selection spans multiple
      // blocks.
      const anchorRef = React.createRef<Element>()
      anchorRef.current = startBlockElement

      if (startBlock.node._key !== endBlock.node._key) {
        const endBlockElement = input.editor.dom.getEndBlockElement(snapshot)

        if (!endBlockElement) {
          sendBack({type: 'set inactive'})
          return
        }

        // Since the selection spans multiple blocks, we adjust the cross
        // offset to be the midpoint between the start and end block.
        const startBlockElementRect = startBlockElement.getBoundingClientRect()
        const startBlockOffset =
          startBlockElementRect.y +
          startBlockElementRect.height / 2 -
          editorRect.y
        const endBlockElementRect = endBlockElement.getBoundingClientRect()
        const endBlockOffset =
          endBlockElementRect.y + endBlockElementRect.height / 2 - editorRect.y
        const crossOffset = (endBlockOffset - startBlockOffset) / 2
        const editorElement = input.editor.dom.getEditorElement()

        sendBack({
          type: 'set active',
          boundaryElement: editorElement,
          anchorRef,
          crossOffset,
        })
        return
      }

      const selectionRect = input.editor.dom.getSelectionRect(snapshot)

      if (!selectionRect) {
        sendBack({type: 'set inactive'})
        return
      }

      const elementRect = startBlockElement.getBoundingClientRect()
      const halfHeight = elementRect.height / 2
      const offset = elementRect.top + halfHeight
      const halfSelectionHeight = selectionRect.height / 2
      const selectionOffset = selectionRect.top + halfSelectionHeight
      const crossOffset = isTextBlock(snapshot.context, startBlock.node)
        ? selectionOffset - offset
        : 0

      sendBack({
        type: 'set active',
        boundaryElement: editorElement,
        anchorRef,
        crossOffset,
      })
    }).unsubscribe
  },
)

const floatingToolbarMachine = setup({
  types: {
    context: {} as {
      editor: Editor
      boundaryElement: Element | undefined
      anchorRef: React.RefObject<Element | null>
      crossOffset: number
      placement: 'top' | 'bottom' | 'left' | 'right'
      guard: (snapshot: EditorSnapshot) => boolean
    },
    input: {} as {
      editor: Editor
      guard: (snapshot: EditorSnapshot) => boolean
      placement: 'top' | 'bottom' | 'left' | 'right'
    },
    events: {} as ActiveListenerEvent | DisableListenerEvent,
  },
  actors: {
    'active listener': activeListener,
    'disable listener': disableListener,
  },
}).createMachine({
  id: 'floating toolbar',
  context: ({input}) => ({
    editor: input.editor,
    boundaryElement: undefined,
    anchorRef: React.createRef<Element>(),
    crossOffset: 0,
    guard: input.guard,
    placement: input.placement,
  }),
  invoke: [
    {
      src: 'active listener',
      input: ({context}) => ({
        editor: context.editor,
        guard: context.guard,
        placement: context.placement,
      }),
    },
    {
      src: 'disable listener',
      input: ({context}) => ({
        editor: context.editor,
      }),
    },
  ],
  initial: 'disabled',
  states: {
    disabled: {
      on: {
        'set active': {
          target: '.active',
          actions: assign({
            boundaryElement: ({event}) => event.boundaryElement,
            anchorRef: ({event}) => event.anchorRef,
            crossOffset: ({event}) => event.crossOffset,
          }),
        },
        'set inactive': {
          target: '.inactive',
        },
      },
      initial: 'inactive',
      states: {
        inactive: {
          on: {
            enable: {
              target: '#floating toolbar.enabled.inactive',
            },
          },
        },
        active: {
          on: {
            enable: {
              target: '#floating toolbar.enabled.active',
            },
          },
        },
      },
    },
    enabled: {
      initial: 'inactive',
      on: {
        'set active': {
          target: '.active',
          actions: assign({
            boundaryElement: ({event}) => event.boundaryElement,
            anchorRef: ({event}) => event.anchorRef,
            crossOffset: ({event}) => event.crossOffset,
          }),
        },
        'set inactive': {
          target: '.inactive',
        },
      },
      states: {
        inactive: {
          on: {
            disable: {
              target: '#floating toolbar.disabled.inactive',
            },
          },
        },
        active: {
          on: {
            disable: {
              target: '#floating toolbar.disabled.active',
            },
          },
        },
      },
    },
  },
})

/**
 * @beta
 */
export type Popover = {
  snapshot: {
    matches: (state: 'active' | 'inactive') => boolean
    context: {
      boundaryElement: Element | undefined
      anchorRef: React.RefObject<Element | null>
      /**
       * The additional offset applied along the cross axis between the popover and its anchor element.
       *
       * Inspired by React Aria (https://react-spectrum.adobe.com/react-aria/Popover.html#offset-and-cross-offset)
       */
      crossOffset: number
      placement: 'top' | 'bottom' | 'left' | 'right'
    }
  }
}

/**
 * @beta
 */
export function usePopover(props: {
  guard: (snapshot: EditorSnapshot) => boolean
  placement: 'top' | 'bottom' | 'left' | 'right'
}): Popover {
  const editor = useEditor()
  const actorRef = useActorRef(floatingToolbarMachine, {
    input: {
      editor,
      guard: props.guard,
      placement: props.placement,
    },
  })
  const snapshot = useSelector(actorRef, (s) => s)

  return {
    snapshot: {
      matches: (state: 'active' | 'inactive') =>
        state === 'active'
          ? snapshot.matches({
              enabled: 'active',
            })
          : snapshot.matches('disabled') ||
            snapshot.matches({enabled: 'inactive'}),
      context: {
        ...snapshot.context,
        placement: props.placement,
      },
    },
  }
}
