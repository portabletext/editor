import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@sanity/types'
import {ActorRefFrom, createActor, emit, setup} from 'xstate'

/**
 * @alpha
 */
export type EditorActor = ActorRefFrom<typeof editorMachine>

/**
 * @alpha
 */
export function createEditorActor() {
  return createActor(editorMachine)
}

export {createEditorActor as createEditor}

/**
 * @alpha
 */
export const editorMachine = setup({
  types: {
    events: {} as {
      type: 'patches'
      patches: Array<Patch>
      snapshot: Array<PortableTextBlock> | undefined
    },
    emitted: {} as {
      type: 'remote patches received'
      patches: Array<Patch>
      snapshot: Array<PortableTextBlock> | undefined
    },
  },
  actions: {
    'emit remote patches received': emit(({event}) => ({
      type: 'remote patches received' as const,
      patches: event.patches.filter((patch) => patch.origin !== 'local'),
      snapshot: event.snapshot,
    })),
  },
  guards: {
    'has remote patches': ({event}) =>
      event.patches.some((patch) => patch.origin !== 'local'),
  },
}).createMachine({
  id: 'editor',
  on: {
    patches: {
      actions: ['emit remote patches received'],
      guard: 'has remote patches',
    },
  },
})
