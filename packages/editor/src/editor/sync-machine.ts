import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {assertEvent, assign, emit, setup, type ActorRefFrom} from 'xstate'
import {withRemoteChanges} from '../engine-plugins/engine-plugin.remote-changes'
import {pluginWithoutHistory} from '../engine-plugins/engine-plugin.without-history'
import {withoutPatching} from '../engine-plugins/engine-plugin.without-patching'
import {withChange} from '../engine/core/change'
import {withoutNormalizing} from '../engine/editor/without-normalizing'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorSchema} from './editor-schema'

export type SyncActor = ActorRefFrom<typeof syncMachine>

export const syncMachine = setup({
  types: {
    context: {} as {
      initialValue: Array<PortableTextBlock> | undefined
      initialValueSynced: boolean
      previousValue: Array<PortableTextBlock> | undefined
      readOnly: boolean
      editorEngine: PortableTextEditorEngine
    },
    input: {} as {
      initialValue: Array<PortableTextBlock> | undefined
      keyGenerator: () => string
      schema: EditorSchema
      readOnly: boolean
      editorEngine: PortableTextEditorEngine
    },
    events: {} as {type: 'update readOnly'; readOnly: boolean},
    emitted: {} as
      | {type: 'patch'; patch: Patch}
      | {type: 'done syncing value'}
      | {type: 'syncing value'},
  },
  actions: {
    'load initial value': ({context}) => {
      const value = context.initialValue
      if (!value || value.length === 0) {
        return
      }
      const editorEngine = context.editorEngine
      withChange(editorEngine, {type: 'value sync', initial: true}, () => {
        withRemoteChanges(editorEngine, 'initial-sync', () => {
          withoutNormalizing(editorEngine, () => {
            pluginWithoutHistory(editorEngine, () => {
              withoutPatching(editorEngine, () => {
                editorEngine.apply({type: 'set', path: [], value})
              })
            })
          })
        })
      })
      editorEngine.onChange()
      editorEngine.lastSyncedValue = value
    },
    'record initial value synced': assign({
      initialValueSynced: true,
      previousValue: ({context}) =>
        context.initialValue?.length ? context.initialValue : undefined,
    }),
    'assign readOnly': assign({
      readOnly: ({event}) => {
        assertEvent(event, 'update readOnly')
        return event.readOnly
      },
    }),
  },
}).createMachine({
  id: 'sync',
  context: ({input}) => ({
    initialValue: input.initialValue,
    initialValueSynced: false,
    previousValue: undefined,
    readOnly: input.readOnly,
    editorEngine: input.editorEngine,
  }),
  initial: 'initializing',
  on: {
    'update readOnly': {actions: 'assign readOnly'},
  },
  states: {
    initializing: {
      always: [
        {
          guard: ({context}) => !context.initialValue?.length,
          target: 'idle',
          actions: [
            'record initial value synced',
            emit({type: 'done syncing value'}),
          ],
        },
        {target: 'syncing'},
      ],
    },
    syncing: {
      entry: [
        emit({type: 'syncing value'}),
        'load initial value',
        'record initial value synced',
      ],
      always: {target: 'idle', actions: emit({type: 'done syncing value'})},
    },
    idle: {},
  },
})
