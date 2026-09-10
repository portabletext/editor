import {
  keyGenerator,
  type EditorSelection,
  type MutationEvent,
  type PatchesEvent,
  type PortableTextBlock,
} from '@portabletext/editor'
import {portableTextToMarkdown} from '@portabletext/markdown'
import {applyAll, type Patch} from '@portabletext/patches'
import type {RangeDecorationLayer} from '@portabletext/plugin-range-decorations'
import {
  assertEvent,
  assign,
  emit,
  fromPromise,
  raise,
  sendParent,
  setup,
  stopChild,
  type ActorRefFrom,
} from 'xstate'
import {
  defaultEditorFeatureFlags,
  defaultPlaygroundFeatureFlags,
  type EditorFeatureFlags,
  type PlaygroundFeatureFlags,
} from './feature-flags'
import {createKeyGenerator} from './key-generator'
import {markdownOptions} from './previews/markdown-options'

const copyToTextClipboardActor = fromPromise(
  ({input}: {input: {text: string}}) => {
    const blob = new Blob([input.text], {type: 'text/plain'})
    const data = [new ClipboardItem({'text/plain': blob})]

    return navigator.clipboard.write(data)
  },
)

export type EditorActorRef = ActorRefFrom<typeof editorMachine>

/**
 * A comment anchored to an editor range, stored on the playground machine
 * so every editor actor reads and writes the same shared list, the way a
 * real backend would.
 */
type RangeComment = {
  id: string
  text: string
  range: NonNullable<EditorSelection>
  status: 'active' | 'orphaned'
  snapshotText?: string
  currentText?: string
}

/**
 * The range-decoration layers the playground's own plugins register,
 * keyed by editor id for the Inspector's Decorations tab.
 */
export type RangeDecorationLayerKind = 'comments' | 'presence'

const editorMachine = setup({
  types: {
    context: {} as {
      value: Array<PortableTextBlock> | undefined
      patchesReceived: Array<
        Patch & {new: boolean; id: string; timestamp: number}
      >
      keyGenerator: () => string
      featureFlags: EditorFeatureFlags
    },
    events: {} as
      | MutationEvent
      | PatchesEvent
      | {type: 'value'; value?: Array<PortableTextBlock>}
      | {type: 'remove'}
      | {type: 'clear stored patches'}
      | {type: 'copy patches'}
      | {type: 'toggle debug mode'}
      | {type: 'toggle key generator'}
      | {type: 'toggle patch subscription'}
      | {type: 'toggle value subscription'}
      | {type: 'toggle patches preview'}
      | {type: 'toggle selection preview'}
      | {type: 'toggle value preview'}
      | {type: 'toggle feature flag'; flag: keyof EditorFeatureFlags},
    emitted: {} as PatchesEvent,
    input: {} as {
      value: Array<PortableTextBlock> | undefined
      keyGenerator: () => string
    },
  },
  actions: {
    'store patches received': assign({
      patchesReceived: ({context, event}) => {
        assertEvent(event, 'patches')
        const timestamp = Date.now()
        return [
          ...context.patchesReceived.map((patch) => ({...patch, new: false})),
          ...event.patches.map((patch) => ({
            ...patch,
            new: true,
            id: keyGenerator(),
            timestamp,
          })),
        ]
      },
    }),
    'emitPatches': emit(({event}) => {
      assertEvent(event, 'patches')
      return event
    }),
    'remove patches from context': assign({
      patchesReceived: [],
    }),
  },
  actors: {
    'copy text to clipboard': copyToTextClipboardActor,
  },
}).createMachine({
  id: 'editor',
  context: ({input}) => ({
    value: input.value,
    patchesReceived: [],
    keyGenerator: input.keyGenerator,
    readOnly: false,
    featureFlags: defaultEditorFeatureFlags,
  }),
  on: {
    'mutation': {
      actions: [
        sendParent(({event, self}) => ({
          ...event,
          type: 'editor.mutation',
          editorId: self.id,
        })),
      ],
    },
    'patches': {
      actions: ['store patches received', 'emitPatches'],
    },
    'value': {
      actions: [
        assign({
          value: ({event}) => event.value,
        }),
      ],
    },
    'remove': {
      actions: [
        sendParent(({self}) => ({type: 'editor.remove', editorId: self.id})),
      ],
    },
    'clear stored patches': {
      actions: ['remove patches from context'],
    },

    'toggle feature flag': {
      actions: assign({
        featureFlags: ({context, event}) => ({
          ...context.featureFlags,
          [event.flag]: !context.featureFlags[event.flag],
        }),
      }),
    },
  },
  type: 'parallel',
  states: {
    'debug mode': {
      initial: 'hidden',
      states: {
        hidden: {on: {'toggle debug mode': {target: 'shown'}}},
        shown: {on: {'toggle debug mode': {target: 'hidden'}}},
      },
    },
    'patches preview': {
      initial: 'hidden',
      states: {
        hidden: {on: {'toggle patches preview': {target: 'shown'}}},
        shown: {on: {'toggle patches preview': {target: 'hidden'}}},
      },
    },
    'selection preview': {
      initial: 'hidden',
      states: {
        hidden: {on: {'toggle selection preview': {target: 'shown'}}},
        shown: {on: {'toggle selection preview': {target: 'hidden'}}},
      },
    },
    'value preview': {
      initial: 'hidden',
      states: {
        hidden: {on: {'toggle value preview': {target: 'shown'}}},
        shown: {on: {'toggle value preview': {target: 'hidden'}}},
      },
    },
    'patch subscription': {
      initial: 'active',
      states: {
        active: {on: {'toggle patch subscription': {target: 'paused'}}},
        paused: {on: {'toggle patch subscription': {target: 'active'}}},
      },
    },
    'value subscription': {
      initial: 'active',
      states: {
        active: {on: {'toggle value subscription': {target: 'paused'}}},
        paused: {on: {'toggle value subscription': {target: 'active'}}},
      },
    },
    'key generator': {
      initial: 'random',
      states: {
        random: {on: {'toggle key generator': {target: 'duplicate'}}},
        duplicate: {on: {'toggle key generator': {target: 'random'}}},
      },
    },
    'copying patches': {
      initial: 'idle',
      states: {
        idle: {
          on: {
            'copy patches': {target: 'copying'},
          },
        },
        copying: {
          invoke: {
            src: 'copy text to clipboard',
            input: ({context}) => ({
              type: 'text/plain',
              text: JSON.stringify(context.patchesReceived),
            }),
            onDone: {
              target: 'idle',
            },
            onError: {
              target: 'idle',
              actions: [
                ({event}) => {
                  console.error(event)
                },
              ],
            },
          },
        },
      },
    },
  },
})

export type GlobalPatchEntry = {
  id: string
  editorId: string
  patches: Array<Patch>
  timestamp: number
}

export type PlaygroundActorRef = ActorRefFrom<typeof playgroundMachine>

export const playgroundMachine = setup({
  types: {
    context: {} as {
      editorIdGenerator: Generator<string, string>
      editors: Array<EditorActorRef>
      featureFlags: PlaygroundFeatureFlags
      value: Array<PortableTextBlock> | undefined
      patchDerivedValue: Array<PortableTextBlock> | undefined
      patchFeed: Array<GlobalPatchEntry>
      comments: Array<RangeComment>
      selections: Record<EditorActorRef['id'], EditorSelection>
      layers: Record<
        EditorActorRef['id'],
        Partial<Record<RangeDecorationLayerKind, RangeDecorationLayer>>
      >
    },
    events: {} as
      | {type: 'add editor'}
      | ({type: 'editor.mutation'; editorId: EditorActorRef['id']} & Omit<
          MutationEvent,
          'type'
        >)
      | {type: 'editor.remove'; editorId: EditorActorRef['id']}
      | {type: 'toggle value'}
      | {type: 'toggle patches'}
      | {type: 'toggle inspector'}
      | {type: 'clear patches'}
      | {type: 'copy value'}
      | {type: 'copy patches'}
      | {type: 'copy markdown'}
      | {
          type: 'add comment'
          text: string
          range: NonNullable<EditorSelection>
          snapshotText?: string
        }
      | {
          type: 'update comment range'
          id: string
          range: NonNullable<EditorSelection>
        }
      | {
          type: 'refresh comment text'
          id: string
          text: string | undefined
        }
      | {type: 'orphan comment'; id: string}
      | {type: 'reactivate comment'; id: string}
      | {type: 'remove comment'; id: string}
      | {
          type: 'update selection'
          editorId: EditorActorRef['id']
          selection: EditorSelection
        }
      | {
          type: 'register layer'
          editorId: EditorActorRef['id']
          kind: RangeDecorationLayerKind
          layer: RangeDecorationLayer
        }
      | {
          type: 'unregister layer'
          editorId: EditorActorRef['id']
          kind: RangeDecorationLayerKind
        }
      | {
          type: 'toggle feature flag'
          flag: keyof PlaygroundFeatureFlags
        },
    input: {} as {
      editorIdGenerator: Generator<string, string>
    },
  },
  actions: {
    'broadcast patches': ({context, event}) => {
      assertEvent(event, 'editor.mutation')
      context.editors.forEach((editor) => {
        editor.send({
          type: 'patches',
          patches: event.patches.map((patch) => ({
            ...patch,
            origin: event.editorId === editor.id ? 'local' : 'remote',
          })),
          snapshot: event.value,
        })
      })
    },
    'update value': assign({
      value: ({event}) => {
        assertEvent(event, 'editor.mutation')
        return event.value
      },
    }),
    'update patch-derived value': assign({
      patchDerivedValue: ({context, event}) => {
        assertEvent(event, 'editor.mutation')
        return applyAll(context.patchDerivedValue ?? [], event.patches)
      },
    }),
    'add to patch feed': assign({
      patchFeed: ({context, event}) => {
        assertEvent(event, 'editor.mutation')
        return [
          {
            id: keyGenerator(),
            editorId: event.editorId,
            patches: event.patches,
            timestamp: Date.now(),
          },
          ...context.patchFeed,
        ]
      },
    }),
    'clear patch feed': assign({
      patchFeed: [],
    }),
    'broadcast value': ({context}) => {
      const value = context.value
      if (value !== null) {
        context.editors.forEach((editor) => {
          editor.send({
            type: 'value',
            value,
          })
        })
      }
    },
    'add editor to context': assign({
      editors: ({context, event, spawn}) => {
        assertEvent(event, 'add editor')
        const editorId = context.editorIdGenerator.next().value
        return [
          ...context.editors,
          spawn('editor machine', {
            input: {
              value: context.value,
              keyGenerator: createKeyGenerator(`e${editorId}-k`),
            },
            id: `e${editorId}`,
          }),
        ]
      },
    }),
    'stop editor': stopChild(({context, event}) => {
      assertEvent(event, 'editor.remove')
      return context.editors.find((editor) => editor.id === event.editorId)!
    }),
    'remove editor from context': assign({
      editors: ({context, event}) => {
        assertEvent(event, 'editor.remove')
        return context.editors.filter((editor) => editor.id !== event.editorId)
      },
    }),
    'remove selection from context': assign({
      selections: ({context, event}) => {
        assertEvent(event, 'editor.remove')
        const {[event.editorId]: removedSelection, ...remainingSelections} =
          context.selections
        return remainingSelections
      },
    }),
    'remove layers from context': assign({
      layers: ({context, event}) => {
        assertEvent(event, 'editor.remove')
        const {[event.editorId]: removedLayers, ...remainingLayers} =
          context.layers
        return remainingLayers
      },
    }),
    'register layer': assign({
      layers: ({context, event}) => {
        assertEvent(event, 'register layer')
        return {
          ...context.layers,
          [event.editorId]: {
            ...context.layers[event.editorId],
            [event.kind]: event.layer,
          },
        }
      },
    }),
    'unregister layer': assign({
      layers: ({context, event}) => {
        assertEvent(event, 'unregister layer')
        const remainingLayers = {...context.layers[event.editorId]}
        delete remainingLayers[event.kind]
        return {...context.layers, [event.editorId]: remainingLayers}
      },
    }),
    'add comment': assign({
      comments: ({context, event}) => {
        assertEvent(event, 'add comment')
        return [
          ...context.comments,
          {
            id: keyGenerator(),
            text: event.text,
            range: event.range,
            status: 'active' as const,
            snapshotText: event.snapshotText,
            currentText: event.snapshotText,
          },
        ]
      },
    }),
    'update comment range': assign({
      comments: ({context, event}) => {
        assertEvent(event, 'update comment range')
        return context.comments.map((comment) =>
          comment.id === event.id ? {...comment, range: event.range} : comment,
        )
      },
    }),
    'refresh comment text': assign({
      comments: ({context, event}) => {
        assertEvent(event, 'refresh comment text')
        return context.comments.map((comment) =>
          comment.id === event.id
            ? {...comment, currentText: event.text}
            : comment,
        )
      },
    }),
    'orphan comment': assign({
      comments: ({context, event}) => {
        assertEvent(event, 'orphan comment')
        return context.comments.map((comment) =>
          comment.id === event.id
            ? {...comment, status: 'orphaned' as const}
            : comment,
        )
      },
    }),
    'reactivate comment': assign({
      comments: ({context, event}) => {
        assertEvent(event, 'reactivate comment')
        return context.comments.map((comment) =>
          comment.id === event.id && comment.status === 'orphaned'
            ? {
                ...comment,
                status: 'active' as const,
                currentText: comment.snapshotText,
              }
            : comment,
        )
      },
    }),
    'remove comment': assign({
      comments: ({context, event}) => {
        assertEvent(event, 'remove comment')
        return context.comments.filter((comment) => comment.id !== event.id)
      },
    }),
    'update selection': assign({
      selections: ({context, event}) => {
        assertEvent(event, 'update selection')
        return {...context.selections, [event.editorId]: event.selection}
      },
    }),
  },
  actors: {
    'editor machine': editorMachine,
    'copy text to clipboard': copyToTextClipboardActor,
  },
}).createMachine({
  id: 'playground',
  context: ({input}) => ({
    editorIdGenerator: input.editorIdGenerator,
    featureFlags: defaultPlaygroundFeatureFlags,
    value: undefined,
    patchDerivedValue: undefined,
    editors: [],
    patchFeed: [],
    comments: [],
    selections: {},
    layers: {},
  }),
  on: {
    'add editor': {
      actions: ['add editor to context'],
    },
    'editor.remove': {
      actions: [
        'stop editor',
        'remove editor from context',
        'remove selection from context',
        'remove layers from context',
      ],
    },
    'editor.mutation': {
      actions: [
        'broadcast patches',
        'update value',
        'update patch-derived value',
        'broadcast value',
        'add to patch feed',
      ],
    },
    'clear patches': {
      actions: ['clear patch feed'],
    },

    'add comment': {
      actions: ['add comment'],
    },
    'update comment range': {
      actions: ['update comment range'],
    },
    'refresh comment text': {
      actions: ['refresh comment text'],
    },
    'orphan comment': {
      actions: ['orphan comment'],
    },
    'reactivate comment': {
      actions: ['reactivate comment'],
    },
    'remove comment': {
      actions: ['remove comment'],
    },
    'update selection': {
      actions: ['update selection'],
    },
    'register layer': {
      actions: ['register layer'],
    },
    'unregister layer': {
      actions: ['unregister layer'],
    },
    'toggle feature flag': {
      actions: assign({
        featureFlags: ({context, event}) => ({
          ...context.featureFlags,
          [event.flag]: !context.featureFlags[event.flag],
        }),
      }),
    },
  },
  entry: [raise({type: 'add editor'}), raise({type: 'add editor'})],
  type: 'parallel',
  states: {
    'value visibility': {
      initial: 'shown',
      states: {
        shown: {on: {'toggle value': {target: 'hidden'}}},
        hidden: {on: {'toggle value': {target: 'shown'}}},
      },
    },
    'patches visibility': {
      initial: 'hidden',
      states: {
        shown: {on: {'toggle patches': {target: 'hidden'}}},
        hidden: {on: {'toggle patches': {target: 'shown'}}},
      },
    },
    'inspector visibility': {
      initial: 'shown',
      states: {
        shown: {on: {'toggle inspector': {target: 'hidden'}}},
        hidden: {on: {'toggle inspector': {target: 'shown'}}},
      },
    },
    'copying value': {
      initial: 'idle',
      states: {
        idle: {
          on: {
            'copy value': {target: 'copying'},
          },
        },
        copying: {
          invoke: {
            src: 'copy text to clipboard',
            input: ({context}) => ({
              text: JSON.stringify(context.patchDerivedValue, null, 2),
            }),
            onDone: {
              target: 'copied',
            },
            onError: {
              target: 'idle',
              actions: [({event}) => console.error(event)],
            },
          },
        },
        copied: {
          after: {
            2000: {target: 'idle'},
          },
        },
      },
    },
    'copying patches': {
      initial: 'idle',
      states: {
        idle: {
          on: {
            'copy patches': {target: 'copying'},
          },
        },
        copying: {
          invoke: {
            src: 'copy text to clipboard',
            input: ({context}) => ({
              text: JSON.stringify(context.patchFeed, null, 2),
            }),
            onDone: {
              target: 'copied',
            },
            onError: {
              target: 'idle',
              actions: [({event}) => console.error(event)],
            },
          },
        },
        copied: {
          after: {
            2000: {target: 'idle'},
          },
        },
      },
    },
    'copying markdown': {
      initial: 'idle',
      states: {
        idle: {
          on: {
            'copy markdown': {target: 'copying'},
          },
        },
        copying: {
          invoke: {
            src: 'copy text to clipboard',
            input: ({context}) => ({
              text: context.patchDerivedValue
                ? portableTextToMarkdown(
                    context.patchDerivedValue,
                    markdownOptions,
                  )
                : '',
            }),
            onDone: {
              target: 'copied',
            },
            onError: {
              target: 'idle',
              actions: [({event}) => console.error(event)],
            },
          },
        },
        copied: {
          after: {
            2000: {target: 'idle'},
          },
        },
      },
    },
  },
})
