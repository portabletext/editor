import {
  useEditor,
  type ChildPath,
  type Editor,
  type PortableTextObject,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {useActor} from '@xstate/react'
import * as React from 'react'
import type {RefObject} from 'react'
import {assign, fromCallback, setup, type AnyEventObject} from 'xstate'
import {disableListener, type DisableListenerEvent} from './disable-listener'
import type {ToolbarInlineObjectSchemaType} from './use-toolbar-schema'

type ActiveContext = {
  inlineObjects: Array<{
    value: PortableTextObject
    schemaType: ToolbarInlineObjectSchemaType
    at: ChildPath
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
  {editor: Editor; schemaTypes: ReadonlyArray<ToolbarInlineObjectSchemaType>},
  ActiveListenerEvent
>(({input, sendBack}) => {
  return input.editor.on('selection', () => {
    const snapshot = input.editor.getSnapshot()

    if (!selectors.isSelectionCollapsed(snapshot)) {
      sendBack({type: 'set inactive'})
      return
    }

    const focusInlineObject = selectors.getFocusInlineObject(snapshot)

    if (!focusInlineObject) {
      sendBack({type: 'set inactive'})
      return
    }

    const schemaType = input.schemaTypes.find(
      (schemaType) => schemaType.name === focusInlineObject.node._type,
    )

    if (!schemaType) {
      sendBack({type: 'set inactive'})
      return
    }

    const selectedNodes = input.editor.dom.getChildNodes(snapshot)
    const firstSelectedNode = selectedNodes.at(0)

    if (!firstSelectedNode || !(firstSelectedNode instanceof Element)) {
      sendBack({type: 'set inactive'})
      return
    }

    const elementRef = React.createRef<Element>()
    elementRef.current = firstSelectedNode

    sendBack({
      type: 'set active',
      inlineObjects: [
        {
          value: focusInlineObject.node,
          schemaType,
          at: focusInlineObject.path,
        },
      ],
      elementRef,
    })
  }).unsubscribe
})

const inlineObjectPopoverMachine = setup({
  types: {
    context: {} as {
      editor: Editor
      schemaTypes: ReadonlyArray<ToolbarInlineObjectSchemaType>
    } & ActiveContext,
    input: {} as {
      editor: Editor
      schemaTypes: ReadonlyArray<ToolbarInlineObjectSchemaType>
    },
    events: {} as
      | DisableListenerEvent
      | ActiveListenerEvent
      | InlineObjectPopoverEvent,
  },
  actions: {
    reset: assign({
      inlineObjects: [],
      elementRef: React.createRef<Element>(),
    }),
  },
  actors: {
    'disable listener': disableListener,
    'active listener': activeListener,
  },
}).createMachine({
  id: 'inline object popover',
  context: ({input}) => ({
    editor: input.editor,
    schemaTypes: input.schemaTypes,
    inlineObjects: [],
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
                inlineObjects: ({event}) => event.inlineObjects,
                elementRef: ({event}) => event.elementRef,
              }),
              target: 'active',
            },
            'enable': {
              target: '#inline object popover.enabled.inactive',
            },
          },
        },
        active: {
          on: {
            'set inactive': {
              target: 'inactive',
            },
            'enable': {
              target: '#inline object popover.enabled.active',
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
                inlineObjects: ({event}) => event.inlineObjects,
                elementRef: ({event}) => event.elementRef,
              }),
            },
            'disable': {
              target: '#inline object popover.disabled.inactive',
            },
          },
        },
        active: {
          on: {
            'set inactive': {
              target: 'inactive',
            },
            'disable': {
              target: '#inline object popover.disabled.active',
            },
            'set active': {
              actions: assign({
                inlineObjects: ({event}) => event.inlineObjects,
                elementRef: ({event}) => event.elementRef,
              }),
            },
            'edit': {
              actions: ({context, event}) => {
                context.editor.send({
                  type: 'child.set',
                  at: event.at,
                  props: event.props,
                })
                context.editor.send({type: 'focus'})
              },
            },
            'remove': {
              actions: ({context, event}) => {
                context.editor.send({
                  type: 'delete.child',
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
export type InlineObjectPopoverEvent =
  | {
      type: 'remove'
      at: ChildPath
    }
  | {
      type: 'edit'
      at: ChildPath
      props: {[key: string]: unknown}
    }
  | {
      type: 'close'
    }

/**
 * @beta
 */
export type InlineObjectPopover = {
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
  send: (event: InlineObjectPopoverEvent) => void
}

/**
 * @beta
 * Manages the state and available events for an inline object popover.
 */
export function useInlineObjectPopover(props: {
  schemaTypes: ReadonlyArray<ToolbarInlineObjectSchemaType>
}): InlineObjectPopover {
  const editor = useEditor()
  const [actorSnapshot, send] = useActor(inlineObjectPopoverMachine, {
    input: {
      editor,
      schemaTypes: props.schemaTypes,
    },
  })

  return {
    snapshot: {
      context: {
        inlineObjects: actorSnapshot.context.inlineObjects,
        elementRef: actorSnapshot.context.elementRef,
      },
      matches: (state) => actorSnapshot.matches(state),
    },
    send,
  }
}
