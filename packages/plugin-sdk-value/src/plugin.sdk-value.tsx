import {
  useEditor,
  type Editor,
  type PortableTextBlock,
  type Patch as PtePatch,
} from '@portabletext/editor'
import type {
  JSONValue,
  Path,
  PathSegment,
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

const ARRAYIFY_ERROR_MESSAGE =
  'Unexpected path format from diffValue output. Please report this issue.'

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

export function arrayifyPath(pathExpr: string): Path {
  const node = parsePath(pathExpr)
  if (!node) {
    return []
  }
  if (node.type !== 'Path') {
    throw new Error(ARRAYIFY_ERROR_MESSAGE)
  }

  return Array.from(getSegments(node)).map((segment): PathSegment => {
    if (segment.type === 'Identifier') {
      return segment.name
    }
    if (segment.type !== 'Subscript') {
      throw new Error(ARRAYIFY_ERROR_MESSAGE)
    }
    if (segment.elements.length !== 1) {
      throw new Error(ARRAYIFY_ERROR_MESSAGE)
    }

    const [element] = segment.elements
    if (element.type === 'Number') {
      return element.value
    }

    if (element.type !== 'Comparison') {
      throw new Error(ARRAYIFY_ERROR_MESSAGE)
    }
    if (element.operator !== '==') {
      throw new Error(ARRAYIFY_ERROR_MESSAGE)
    }
    const keyPathNode = [element.left, element.right].find(isKeyPath)
    if (!keyPathNode) {
      throw new Error(ARRAYIFY_ERROR_MESSAGE)
    }
    const other = element.left === keyPathNode ? element.right : element.left
    if (other.type !== 'String') {
      throw new Error(ARRAYIFY_ERROR_MESSAGE)
    }
    return {_key: other.value}
  })
}

export function convertPatches(patches: SanityPatchOperations[]): PtePatch[] {
  return patches.flatMap((p) => {
    return Object.entries(p).flatMap(([type, values]): PtePatch[] => {
      const origin = 'remote'

      switch (type) {
        case 'set':
        case 'setIfMissing':
        case 'diffMatchPatch':
        case 'inc':
        case 'dec': {
          return Object.entries(values).map(
            ([pathExpr, value]) =>
              ({type, value, origin, path: arrayifyPath(pathExpr)}) as PtePatch,
          )
        }
        case 'unset': {
          if (!Array.isArray(values)) {
            return []
          }
          return values.map(arrayifyPath).map((path) => ({type, origin, path}))
        }
        case 'insert': {
          const {items, ...rest} = values as InsertPatch['insert']
          type InsertPosition = PteInsertPatch['position']
          const position = Object.keys(rest).at(0) as InsertPosition | undefined

          if (!position) {
            return []
          }
          const pathExpr = (rest as {[K in InsertPosition]: string})[position]
          const insertPatch: PteInsertPatch = {
            type,
            origin,
            position,
            path: arrayifyPath(pathExpr),
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
  const patches = convertPatches(diffValue(snapshot, remoteValue))

  if (patches.length) {
    editor.send({type: 'patches', patches, snapshot})
  }
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
      context.editor.send({
        type: 'update value',
        value: context.getRemoteValue() ?? [],
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

type ValueSyncConfig = {
  getRemoteValue: () => PortableTextBlock[] | null | undefined
  pushValue: (value: PortableTextBlock[]) => void
  onRemoteValueChange: (callback: () => void) => () => void
}

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
