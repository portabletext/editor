import {Patch} from '@portabletext/editor'
import {applyAll} from '@portabletext/patches/apply'
import {PortableTextBlock} from '@sanity/types'
import {assign, createActor, setup} from 'xstate'

const editorMachine = setup({
  types: {
    context: {} as {
      value: Array<PortableTextBlock>
    },
    events: {} as {
      type: 'mutation'
      patches: Array<Patch>
    },
  },
  actions: {
    'apply patches': assign({
      value: ({context, event}) => applyAll(context.value, event.patches) ?? [],
    }),
  },
}).createMachine({id: 'editor', context: {value: []}, on: {mutation: {actions: ['apply patches']}}})

const persistedStateKey = 'portable-text-playground-state'

const persistedState = localStorage.getItem(persistedStateKey)

export const editorActor = createActor(editorMachine, {
  snapshot: persistedState ? JSON.parse(persistedState) : undefined,
})

editorActor.start()

editorActor.subscribe(() => {
  localStorage.setItem(persistedStateKey, JSON.stringify(editorActor.getPersistedSnapshot()))
})
