import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@sanity/types'
import {Editor} from 'slate'
import {assign, emit, setup} from 'xstate'
import type {PortableTextSlateEditor} from '../types/editor'
import {fromSlateValue} from '../utils/values'
import {KEY_TO_VALUE_ELEMENT} from '../utils/weakMaps'
import type {EditorSchema} from './define-schema'

const FLUSH_PATCHES_THROTTLED_MS = process.env.NODE_ENV === 'test' ? 500 : 1000

/**
 * Makes sure editor mutation events are debounced
 */
export const mutationMachine = setup({
  types: {
    context: {} as {
      pendingPatches: Array<Patch>
      schema: EditorSchema
      slateEditor: PortableTextSlateEditor
    },
    events: {} as {type: 'patch'; patch: Patch},
    input: {} as {
      schema: EditorSchema
      slateEditor: PortableTextSlateEditor
    },
    emitted: {} as
      | {
          type: 'has pending patches'
        }
      | {
          type: 'mutation'
          patches: Array<Patch>
          snapshot: Array<PortableTextBlock> | undefined
        },
  },
  actions: {
    'emit has pending patches': emit({type: 'has pending patches'}),
    'emit mutation': emit(({context}) => ({
      type: 'mutation' as const,
      patches: context.pendingPatches,
      snapshot: fromSlateValue(
        context.slateEditor.children,
        context.schema.block.name,
        KEY_TO_VALUE_ELEMENT.get(context.slateEditor),
      ),
    })),
    'clear pending patches': assign({
      pendingPatches: [],
    }),
    'defer patch': assign({
      pendingPatches: ({context, event}) => [
        ...context.pendingPatches,
        event.patch,
      ],
    }),
  },
  guards: {
    'slate is normalizing': ({context}) =>
      Editor.isNormalizing(context.slateEditor),
  },
}).createMachine({
  id: 'mutation',
  context: ({input}) => ({
    pendingPatches: [],
    schema: input.schema,
    slateEditor: input.slateEditor,
  }),
  initial: 'idle',
  states: {
    'idle': {
      on: {
        patch: {
          actions: ['defer patch', 'emit has pending patches'],
          target: 'has pending patches',
        },
      },
    },
    'has pending patches': {
      after: {
        [FLUSH_PATCHES_THROTTLED_MS]: [
          {
            guard: 'slate is normalizing',
            target: 'idle',
            actions: ['emit mutation', 'clear pending patches'],
          },
          {
            reenter: true,
          },
        ],
      },
      on: {
        patch: {
          actions: ['defer patch'],
          reenter: true,
        },
      },
    },
  },
})
