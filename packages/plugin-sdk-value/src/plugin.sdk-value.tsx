import {
  useEditor,
  type Editor,
  type PortableTextBlock,
  type Patch as PtePatch,
} from '@portabletext/editor'
import type {
  JSONValue,
  Path,
  InsertPatch as PteInsertPatch,
} from '@portabletext/patches'
import {diffValue, type SanityPatchOperations} from '@sanity/diff-patch'
import {
  parsePath,
  type ExprNode,
  type PathNode,
  type SegmentNode,
  type ThisNode,
} from '@sanity/json-match'
import {
  getDocumentState,
  useEditDocument,
  useSanityInstance,
  type DocumentHandle,
} from '@sanity/sdk-react'
import {useActorRef} from '@xstate/react'
import {fromCallback, setup, type AnyEventObject} from 'xstate'

type InsertPatch = Required<Pick<SanityPatchOperations, 'insert'>>

function* getSegments(
  node: PathNode,
): Generator<Exclude<SegmentNode, ThisNode>> {
  if (node.base) {
    yield* getSegments(node.base)
  }
  if (node.segment.type !== 'This') {
    yield node.segment
  }
}

function isKeyPath(node: ExprNode): node is PathNode {
  if (node.type !== 'Path') {
    return false
  }
  if (node.base) {
    return false
  }
  if (node.recursive) {
    return false
  }
  if (node.segment.type !== 'Identifier') {
    return false
  }
  return node.segment.name === '_key'
}

/**
 * Converts a `diffValue` path expression (e.g. `[_key=="a"].children[0]`) into
 * a keyed Portable Text Editor path.
 *
 * Returns `null` – rather than throwing – for any expression that can't be
 * represented as a keyed PTE path. `diffValue` can emit such expressions in
 * practice: removing several non-keyed array items at once (e.g. clearing
 * multiple span `marks`) produces an array slice like `...marks[1:]`. Throwing
 * here would escape the synchronous `applySync` and break syncing entirely, so
 * we signal failure via `null` and let the caller skip the offending patch and
 * recover.
 */
export function arrayifyPath(pathExpr: string): Path | null {
  let node: ExprNode | undefined
  try {
    node = parsePath(pathExpr)
  } catch {
    // `parsePath` throws on malformed input such as an empty expression.
    return null
  }
  if (!node) {
    return null
  }
  if (node.type !== 'Path') {
    return null
  }

  const path: Path = []
  for (const segment of getSegments(node)) {
    if (segment.type === 'Identifier') {
      path.push(segment.name)
      continue
    }
    if (segment.type !== 'Subscript') {
      return null
    }
    if (segment.elements.length !== 1) {
      return null
    }

    const [element] = segment.elements
    if (element.type === 'Number') {
      path.push(element.value)
      continue
    }
    if (element.type !== 'Comparison') {
      // e.g. an array slice (`Slice`) that `diffValue` emits when removing
      // multiple non-keyed items at once.
      return null
    }
    if (element.operator !== '==') {
      return null
    }
    const keyPathNode = [element.left, element.right].find(isKeyPath)
    if (!keyPathNode) {
      return null
    }
    const other = element.left === keyPathNode ? element.right : element.left
    if (other.type !== 'String') {
      return null
    }
    path.push({_key: other.value})
  }

  return path
}

/**
 * Converts a batch of `diffValue` patch operations into PTE patches.
 *
 * `incomplete` is `true` when one or more operations had to be dropped because
 * their path couldn't be converted (see `arrayifyPath`). The caller uses this
 * to fall back to an authoritative full value update instead of persisting a
 * partial diff.
 */
export function convertPatches(patches: SanityPatchOperations[]): {
  patches: PtePatch[]
  incomplete: boolean
} {
  let incomplete = false

  const converted = patches.flatMap((operation) => {
    return Object.entries(operation).flatMap(([type, values]): PtePatch[] => {
      const origin = 'remote'

      switch (type) {
        case 'set':
        case 'setIfMissing':
        case 'diffMatchPatch':
        case 'inc':
        case 'dec': {
          return Object.entries(values).flatMap(([pathExpr, value]) => {
            const path = arrayifyPath(pathExpr)
            if (!path) {
              incomplete = true
              return []
            }
            return [{type, value, origin, path} as PtePatch]
          })
        }
        case 'unset': {
          if (!Array.isArray(values)) {
            return []
          }
          return values.flatMap((pathExpr) => {
            const path = arrayifyPath(pathExpr)
            if (!path) {
              incomplete = true
              return []
            }
            return [{type, origin, path} as PtePatch]
          })
        }
        case 'insert': {
          const {items, ...rest} = values as InsertPatch['insert']
          type InsertPosition = PteInsertPatch['position']
          const position = Object.keys(rest).at(0) as InsertPosition | undefined

          if (!position) {
            return []
          }
          const pathExpr = (rest as {[K in InsertPosition]: string})[position]
          const path = arrayifyPath(pathExpr)
          if (!path) {
            incomplete = true
            return []
          }
          const insertPatch: PteInsertPatch = {
            type,
            origin,
            position,
            path,
            items: items as JSONValue[],
          }

          return [insertPatch]
        }

        default: {
          return []
        }
      }
    })
  })

  return {patches: converted, incomplete}
}

function applySync({
  editor,
  getRemoteValue,
}: {
  editor: Editor
  getRemoteValue: () => PortableTextBlock[] | null | undefined
}) {
  const remoteValue = getRemoteValue()

  if (!remoteValue) {
    return
  }

  const snapshot = editor.getSnapshot().context.value
  const {patches, incomplete} = convertPatches(diffValue(snapshot, remoteValue))

  // Recover with an authoritative full value update when the diff can't be
  // applied faithfully. Either a patch was dropped – replaying the rest would
  // leave the editor in a partial/garbled state – or the editor moved on from
  // `snapshot` while we were diffing, so the patches were computed against a
  // value the editor no longer holds and can't be reconciled safely.
  if (incomplete || editor.getSnapshot().context.value !== snapshot) {
    updateValueFromRemote({editor, getRemoteValue})
    return
  }

  if (patches.length) {
    editor.send({type: 'patches', patches, snapshot})
  }
}

function updateValueFromRemote({
  editor,
  getRemoteValue,
}: {
  editor: Editor
  getRemoteValue: () => PortableTextBlock[] | null | undefined
}) {
  editor.send({type: 'update value', value: getRemoteValue() ?? []})
}

const listenToEditor = fromCallback<AnyEventObject, {editor: Editor}>(
  ({sendBack, input}) => {
    const patchSubscription = input.editor.on('patch', () => {
      sendBack({type: 'patch emitted'})
    })

    const mutationSubscription = input.editor.on('mutation', (event) => {
      sendBack({type: 'mutation flushed', value: event.value})
    })

    return () => {
      patchSubscription.unsubscribe()
      mutationSubscription.unsubscribe()
    }
  },
)

const listenToRemote = fromCallback<
  AnyEventObject,
  {onRemoteValueChange: ValueSyncConfig['onRemoteValueChange']}
>(({sendBack, input}) => {
  return input.onRemoteValueChange(() => {
    sendBack({type: 'remote value changed'})
  })
})

const valueSyncMachine = setup({
  types: {
    context: {} as {
      editor: Editor
      getRemoteValue: ValueSyncConfig['getRemoteValue']
      onRemoteValueChange: ValueSyncConfig['onRemoteValueChange']
    },
    input: {} as {
      editor: Editor
      getRemoteValue: ValueSyncConfig['getRemoteValue']
      onRemoteValueChange: ValueSyncConfig['onRemoteValueChange']
    },
    events: {} as
      | {type: 'patch emitted'}
      | {type: 'mutation flushed'; value: PortableTextBlock[] | undefined}
      | {type: 'remote value changed'},
  },
  actions: {
    'send initial value': ({context}) => {
      updateValueFromRemote({
        editor: context.editor,
        getRemoteValue: context.getRemoteValue,
      })
    },
    'push to remote': () => {
      throw new Error('push to remote must be provided via .provide()')
    },
    'apply sync': ({context}) => {
      applySync({
        editor: context.editor,
        getRemoteValue: context.getRemoteValue,
      })
    },
    'defer then apply sync': ({context}) => {
      queueMicrotask(() => {
        applySync({
          editor: context.editor,
          getRemoteValue: context.getRemoteValue,
        })
      })
    },
  },
  actors: {
    'listen to editor': listenToEditor,
    'listen to remote': listenToRemote,
  },
}).createMachine({
  id: 'value sync',
  context: ({input}) => ({
    editor: input.editor,
    getRemoteValue: input.getRemoteValue,
    onRemoteValueChange: input.onRemoteValueChange,
  }),
  entry: ['send initial value'],
  invoke: [
    {
      src: 'listen to editor',
      input: ({context}) => ({editor: context.editor}),
    },
    {
      src: 'listen to remote',
      input: ({context}) => ({
        onRemoteValueChange: context.onRemoteValueChange,
      }),
    },
  ],
  initial: 'idle',
  states: {
    'idle': {
      on: {
        'patch emitted': {
          target: 'local write',
        },
        'remote value changed': {
          actions: ['apply sync'],
        },
      },
    },
    'local write': {
      on: {
        'patch emitted': {},
        'mutation flushed': {
          target: 'pushing to remote',
          actions: ['push to remote'],
        },
        'remote value changed': {
          target: 'pending sync',
        },
      },
    },
    'pushing to remote': {
      on: {
        'patch emitted': {
          target: 'local write',
        },
        'remote value changed': {
          target: 'idle',
        },
      },
    },
    'pending sync': {
      on: {
        'patch emitted': {},
        'mutation flushed': {
          target: 'pushing to remote',
          actions: ['push to remote', 'defer then apply sync'],
        },
        'remote value changed': {},
      },
    },
  },
})

interface SDKValuePluginProps extends DocumentHandle {
  path: string
}

/**
 * @public
 */
export function SDKValuePlugin(props: SDKValuePluginProps) {
  const {documentId, documentType, path} = props
  const setSdkValue = useEditDocument(props)
  const instance = useSanityInstance(props)

  const handle = {documentId, documentType, path}
  const {getCurrent, subscribe} = getDocumentState<PortableTextBlock[]>(
    instance,
    handle,
  )

  return (
    <ValueSyncPlugin
      getRemoteValue={getCurrent}
      pushValue={setSdkValue}
      onRemoteValueChange={subscribe}
    />
  )
}

/**
 * @internal
 */
type ValueSyncConfig = {
  getRemoteValue: () => PortableTextBlock[] | null | undefined
  pushValue: (value: PortableTextBlock[]) => void
  onRemoteValueChange: (callback: () => void) => () => void
}

/**
 * NOTE: You are probably looking for SDKValuePlugin instead of this.
 * This is a lower-level plugin that only handles syncing the value
 * between the editor and a remote source. It does not know anything
 * about Sanity documents or how to fetch/update them.
 *
 * May be removed in the future, do not rely on this directly.
 *
 * @internal
 */
export function ValueSyncPlugin(props: ValueSyncConfig) {
  const {getRemoteValue, pushValue, onRemoteValueChange} = props
  const editor = useEditor()

  useActorRef(
    valueSyncMachine.provide({
      actions: {
        'push to remote': ({context, event}) => {
          if (event.type !== 'mutation flushed') {
            return
          }

          pushValue(event.value ?? context.editor.getSnapshot().context.value)
        },
      },
    }),
    {
      input: {
        editor,
        getRemoteValue,
        onRemoteValueChange,
      },
    },
  )

  return null
}
