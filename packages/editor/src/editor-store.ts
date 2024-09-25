import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@sanity/types'
import {createActor, emit, setup} from 'xstate'

/********************
 * Editor Store
 ********************/

/**
 * @alpha
 */
export type EditorStore = ReturnType<typeof createEditorStore>

/**
 * @alpha
 */
export function createEditorStore() {
  return createActor(editorStoreMachine)
}

/********************
 * Editor Store Machine
 ********************/

const editorStoreMachine = setup({
  types: {
    events: {} as {
      type: 'patches'
      patches: Array<Patch>
      snapshot: Array<PortableTextBlock> | undefined
    },
    emitted: {} as {
      type: 'remote patches'
      patches: Array<Patch>
      snapshot: Array<PortableTextBlock> | undefined
    },
  },
  actions: {
    'emit remote patches': emit(({event}) => ({
      type: 'remote patches' as const,
      patches: event.patches.filter((patch) => patch.origin !== 'local'),
      snapshot: event.snapshot,
    })),
  },
  guards: {
    'has remote patches': ({event}) =>
      event.patches.some((patch) => patch.origin !== 'local'),
  },
}).createMachine({
  id: 'editor store',
  on: {
    patches: {
      actions: ['emit remote patches'],
      guard: 'has remote patches',
    },
  },
})
