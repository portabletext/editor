import {
  useEditor,
  type BlockPath,
  type Editor,
  type PortableTextObject,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {useActor} from '@xstate/react'
import * as React from 'react'
import type {RefObject} from 'react'
import {assign, fromCallback, setup, type AnyEventObject} from 'xstate'
import {disableListener, type DisableListenerEvent} from './disable-listener'
import type {ToolbarBlockObjectSchemaType} from './use-toolbar-schema'

type ActiveContext = {
  blockObjects: Array<{
    value: PortableTextObject
    schemaType: ToolbarBlockObjectSchemaType
    at: BlockPath
  }>
  elementRef: RefObject<Element | null>
}

type ActiveListenerEvent =
  | ({
      type: 'set active'
    } & ActiveContext)
  | {
      type: 'set inactive'
    }

const activeListener = fromCallback<
  AnyEventObject,
  {editor: Editor; schemaTypes: ReadonlyArray<ToolbarBlockObjectSchemaType>},
  ActiveListenerEvent
>(({input, sendBack}) => {
  return input.editor.on('selection', () => {
    const snapshot = input.editor.getSnapshot()

    if (!selectors.isSelectionCollapsed(snapshot)) {
      sendBack({type: 'set inactive'})
      return
    }

    const focusBlockObject = selectors.getFocusBlockObject(snapshot)

    if (!focusBlockObject) {
      sendBack({type: 'set inactive'})
      return
    }

    const schemaType = input.schemaTypes.find(
      (schemaType) => schemaType.name === focusBlockObject.node._type,
    )

    if (!schemaType) {
      sendBack({type: 'set inactive'})
      return
    }

    const selectedNodes = input.editor.dom.getBlockNodes(snapshot)
    const firstSelectedNode = selectedNodes.at(0)

    if (!firstSelectedNode || !(firstSelectedNode instanceof Element)) {
      sendBack({type: 'set inactive'})
      return
    }

    const elementRef = React.createRef<Element>()
    elementRef.current = firstSelectedNode

    sendBack({
      type: 'set active',
      blockObjects: [
        {
          value: focusBlockObject.node,
          schemaType,
          at: focusBlockObject.path,
        },
      ],
      elementRef,
    })
  }).unsubscribe
})

const blockObjectPopoverMachine = setup({
  types: {
    context: {} as {
      editor: Editor
      schemaTypes: ReadonlyArray<ToolbarBlockObjectSchemaType>
    } & ActiveContext,
    input: {} as {
      editor: Editor
      schemaTypes: ReadonlyArray<ToolbarBlockObjectSchemaType>
    },
    events: {} as
      | DisableListenerEvent
      | ActiveListenerEvent
      | BlockObjectPopoverEvent,
  },
  actions: {
    reset: assign({
      blockObjects: [],
      elementRef: React.createRef<Element>(),
    }),
  },
  actors: {
    'disable listener': disableListener,
    'active listener': activeListener,
  },
}).createMachine({
  id: 'block object popover',
  context: ({input}) => ({
    editor: input.editor,
    schemaTypes: input.schemaTypes,
    blockObjects: [],
    elementRef: React.createRef<Element>(),
  }),
  invoke: [
    {src: 'disable listener', input: ({context}) => ({editor: context.editor})},
    {
      src: 'active listener',
      input: ({context}) => ({
        editor: context.editor,
        schemaTypes: context.schemaTypes,
      }),
    },
  ],
  initial: 'disabled',
  states: {
    disabled: {
      initial: 'inactive',
      states: {
        inactive: {
          entry: ['reset'],
          on: {
            'set active': {
              actions: assign({
                blockObjects: ({event}) => event.blockObjects,
                elementRef: ({event}) => event.elementRef,
              }),
              target: 'active',
            },
            'enable': {
              target: '#block object popover.enabled.inactive',
            },
          },
        },
        active: {
          on: {
            'set inactive': {
              target: 'inactive',
            },
            'enable': {
              target: '#block object popover.enabled.active',
            },
          },
        },
      },
    },
    enabled: {
      initial: 'inactive',
      states: {
        inactive: {
          entry: ['reset'],
          on: {
            'set active': {
              target: 'active',
              actions: assign({
                blockObjects: ({event}) => event.blockObjects,
                elementRef: ({event}) => event.elementRef,
              }),
            },
            'disable': {
              target: '#block object popover.disabled.inactive',
            },
          },
        },
        active: {
          on: {
            'set inactive': {
              target: 'inactive',
            },
            'disable': {
              target: '#block object popover.disabled.active',
            },
            'set active': {
              actions: assign({
                blockObjects: ({event}) => event.blockObjects,
                elementRef: ({event}) => event.elementRef,
              }),
            },
            'edit': {
              actions: ({context, event}) => {
                context.editor.send({
                  type: 'block.set',
                  at: event.at,
                  props: event.props,
                })
                context.editor.send({type: 'focus'})
              },
            },
            'remove': {
              actions: ({context, event}) => {
                context.editor.send({
                  type: 'delete.block',
                  at: event.at,
                })
                context.editor.send({type: 'focus'})
              },
            },
            'close': {
              actions: ({context}) => {
                context.editor.send({type: 'focus'})
              },
              target: 'inactive',
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
export type BlockObjectPopoverEvent =
  | {
      type: 'remove'
      at: BlockPath
    }
  | {
      type: 'edit'
      at: BlockPath
      props: {[key: string]: unknown}
    }
  | {
      type: 'close'
    }

/**
 * @beta
 */
export type BlockObjectPopover = {
  snapshot: {
    context: ActiveContext
    matches: (
      state:
        | 'disabled'
        | 'enabled'
        | {
            enabled: 'inactive' | 'active'
          },
    ) => boolean
  }
  send: (event: BlockObjectPopoverEvent) => void
}

/**
 * @beta
 * Manages the state and available events for a block object popover.
 */
export function useBlockObjectPopover(props: {
  schemaTypes: ReadonlyArray<ToolbarBlockObjectSchemaType>
}): BlockObjectPopover {
  const editor = useEditor()
  const [actorSnapshot, send] = useActor(blockObjectPopoverMachine, {
    input: {
      editor,
      schemaTypes: props.schemaTypes,
    },
  })

  return {
    snapshot: {
      context: {
        blockObjects: actorSnapshot.context.blockObjects,
        elementRef: actorSnapshot.context.elementRef,
      },
      matches: (state) => actorSnapshot.matches(state),
    },
    send,
  }
}
