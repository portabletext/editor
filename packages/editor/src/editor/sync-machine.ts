import type {PortableTextBlock} from '@portabletext/schema'
import {emit, setup, type ActorRefFrom} from 'xstate'
import {withRemoteChanges} from '../engine-plugins/engine-plugin.remote-changes'
import {pluginWithoutHistory} from '../engine-plugins/engine-plugin.without-history'
import {withoutPatching} from '../engine-plugins/engine-plugin.without-patching'
import {withChange} from '../engine/core/change'
import {withoutNormalizing} from '../engine/editor/without-normalizing'
import type {PortableTextEditorEngine} from '../types/editor-engine'

export type SyncActor = ActorRefFrom<typeof syncMachine>

export const syncMachine = setup({
  types: {
    context: {} as {
      initialValue: Array<PortableTextBlock> | undefined
      editorEngine: PortableTextEditorEngine
    },
    input: {} as {
      initialValue: Array<PortableTextBlock> | undefined
      editorEngine: PortableTextEditorEngine
    },
    emitted: {} as {type: 'done loading'},
  },
  actions: {
    'load initial value': ({context}) => {
      const value = context.initialValue
      if (!value || value.length === 0) {
        return
      }
      const editorEngine = context.editorEngine
      withChange(editorEngine, {type: 'load'}, () => {
        withRemoteChanges(editorEngine, () => {
          withoutNormalizing(editorEngine, () => {
            pluginWithoutHistory(editorEngine, () => {
              withoutPatching(editorEngine, () => {
                editorEngine.apply({type: 'set', path: [], value: [...value]})
              })
            })
          })
        })
      })
      editorEngine.onChange()
      editorEngine.lastSyncedValue = value
    },
  },
}).createMachine({
  id: 'sync',
  context: ({input}) => ({
    initialValue: input.initialValue,
    editorEngine: input.editorEngine,
  }),
  initial: 'initializing',
  states: {
    initializing: {
      always: [
        {
          guard: ({context}) => !context.initialValue?.length,
          target: 'idle',
          actions: emit({type: 'done loading'}),
        },
        {target: 'syncing'},
      ],
    },
    syncing: {
      entry: ['load initial value'],
      always: {target: 'idle', actions: emit({type: 'done loading'})},
    },
    idle: {},
  },
})
