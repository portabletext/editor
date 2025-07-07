import {
  useEditor,
  type AnnotationPath,
  type AnnotationSchemaType,
  type Editor,
  type PortableTextObject,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {useActor} from '@xstate/react'
import * as React from 'react'
import type {RefObject} from 'react'
import {assign, fromCallback, setup, type AnyEventObject} from 'xstate'
import {disableListener, type DisableListenerEvent} from './disable-listener'
import type {ToolbarAnnotationSchemaType} from './use-toolbar-schema'

type ActiveContext = {
  annotations: Array<{
    value: PortableTextObject
    schemaType: ToolbarAnnotationSchemaType
    at: AnnotationPath
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
  {editor: Editor; schemaTypes: ReadonlyArray<ToolbarAnnotationSchemaType>},
  ActiveListenerEvent
>(({input, sendBack}) => {
  return input.editor.on('*', () => {
    const snapshot = input.editor.getSnapshot()
    const activeAnnotations = selectors.getActiveAnnotations(snapshot)
    const focusBlock = selectors.getFocusBlock(snapshot)

    if (activeAnnotations.length === 0 || !focusBlock) {
      sendBack({type: 'set inactive'})
      return
    }

    const selectedChildren = input.editor.dom.getChildNodes(snapshot)
    const firstSelectedChild = selectedChildren.at(0)

    if (!firstSelectedChild || !(firstSelectedChild instanceof Element)) {
      sendBack({type: 'set inactive'})
      return
    }

    const elementRef = React.createRef<Element>()
    elementRef.current = firstSelectedChild

    sendBack({
      type: 'set active',
      annotations: activeAnnotations.flatMap((annotation) => {
        const schemaType = input.schemaTypes.find(
          (schemaType) => schemaType.name === annotation._type,
        )

        if (!schemaType) {
          return []
        }

        return {
          value: annotation,
          schemaType,
          at: [
            {_key: focusBlock.node._key},
            'markDefs',
            {_key: annotation._key},
          ],
        }
      }),
      elementRef,
    })
  }).unsubscribe
})

const annotationPopoverMachine = setup({
  types: {
    context: {} as {
      editor: Editor
      schemaTypes: ReadonlyArray<ToolbarAnnotationSchemaType>
    } & ActiveContext,
    input: {} as {
      editor: Editor
      schemaTypes: ReadonlyArray<ToolbarAnnotationSchemaType>
    },
    events: {} as
      | DisableListenerEvent
      | ActiveListenerEvent
      | AnnotationPopoverEvent,
  },
  actions: {
    reset: assign({
      annotations: [],
      elementRef: React.createRef<Element>(),
    }),
    remove: ({context, event}) => {
      if (event.type !== 'remove') {
        return
      }

      context.editor.send({
        type: 'annotation.remove',
        annotation: {
          name: event.schemaType.name,
        },
      })
      context.editor.send({type: 'focus'})
    },
  },
  actors: {
    'disable listener': disableListener,
    'active listener': activeListener,
  },
}).createMachine({
  id: 'annotation popover',
  context: ({input}) => ({
    editor: input.editor,
    schemaTypes: input.schemaTypes,
    annotations: [],
    elementRef: React.createRef<Element>(),
  }),
  invoke: [
    {src: 'disable listener', input: ({context}) => ({editor: context.editor})},
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
                annotations: ({event}) => event.annotations,
                elementRef: ({event}) => event.elementRef,
              }),
              target: 'active',
            },
            'enable': {
              target: '#annotation popover.enabled.inactive',
            },
          },
        },
        active: {
          on: {
            'set inactive': {
              target: 'inactive',
            },
            'enable': {
              target: '#annotation popover.enabled.active',
            },
          },
        },
      },
    },
    enabled: {
      invoke: [
        {
          src: 'active listener',
          input: ({context}) => ({
            editor: context.editor,
            schemaTypes: context.schemaTypes,
          }),
        },
      ],
      initial: 'inactive',
      states: {
        inactive: {
          entry: ['reset'],
          on: {
            'set active': {
              target: 'active',
              actions: assign({
                annotations: ({event}) => event.annotations,
                elementRef: ({event}) => event.elementRef,
              }),
            },
            'disable': {
              target: '#annotation popover.disabled.inactive',
            },
          },
        },
        active: {
          on: {
            'set inactive': {
              target: 'inactive',
            },
            'disable': {
              target: '#annotation popover.disabled.active',
            },
            'set active': {
              actions: assign({
                annotations: ({event}) => event.annotations,
                elementRef: ({event}) => event.elementRef,
              }),
            },
            'edit': {
              actions: ({context, event}) => {
                context.editor.send({
                  type: 'annotation.set',
                  at: event.at,
                  props: event.props,
                })
                context.editor.send({type: 'focus'})
              },
            },
            'remove': {
              actions: ({context, event}) => {
                context.editor.send({
                  type: 'annotation.remove',
                  annotation: {
                    name: event.schemaType.name,
                  },
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
export type AnnotationPopoverEvent =
  | {
      type: 'remove'
      schemaType: AnnotationSchemaType
    }
  | {
      type: 'edit'
      at: AnnotationPath
      props: {[key: string]: unknown}
    }
  | {
      type: 'close'
    }

/**
 * @beta
 */
export type AnnotationPopover = {
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
  send: (event: AnnotationPopoverEvent) => void
}

/**
 * @beta
 * Manages the state and available events for an annotation popover.
 */
export function useAnnotationPopover(props: {
  schemaTypes: ReadonlyArray<ToolbarAnnotationSchemaType>
}): AnnotationPopover {
  const editor = useEditor()
  const [actorSnapshot, send] = useActor(annotationPopoverMachine, {
    input: {
      editor,
      schemaTypes: props.schemaTypes,
    },
  })

  return {
    snapshot: {
      context: {
        annotations: actorSnapshot.context.annotations,
        elementRef: actorSnapshot.context.elementRef,
      },
      matches: (state) => actorSnapshot.matches(state),
    },
    send,
  }
}
