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
  type SanityInstance,
} from '@sanity/sdk-react'
import {useActorRef} from '@xstate/react'
import {fromCallback, setup, type AnyEventObject} from 'xstate'

interface SDKValuePluginProps extends DocumentHandle {
  path: string
}

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
  getSdkValue,
}: {
  editor: Editor
  getSdkValue: () => PortableTextBlock[] | null | undefined
}) {
  const sdkValue = getSdkValue()

  if (!sdkValue) {
    return
  }

  const snapshot = editor.getSnapshot().context.value
  const patches = convertPatches(diffValue(snapshot, sdkValue))

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

const listenToSdk = fromCallback<
  AnyEventObject,
  {instance: SanityInstance; handle: DocumentHandle & {path: string}}
>(({sendBack, input}) => {
  const {subscribe: onSdkValueChange} = getDocumentState<PortableTextBlock[]>(
    input.instance,
    input.handle,
  )

  const unsubscribe = onSdkValueChange(() => {
    sendBack({type: 'sdk value changed'})
  })

  return () => unsubscribe()
})

const sdkValueMachine = setup({
  types: {
    context: {} as {
      editor: Editor
      instance: SanityInstance
      handle: DocumentHandle & {path: string}
      getSdkValue: () => PortableTextBlock[] | null | undefined
    },
    input: {} as {
      editor: Editor
      instance: SanityInstance
      handle: DocumentHandle & {path: string}
    },
    events: {} as
      | {type: 'patch emitted'}
      | {type: 'mutation flushed'; value: PortableTextBlock[] | undefined}
      | {type: 'sdk value changed'},
  },
  actions: {
    'send initial value': ({context}) => {
      context.editor.send({
        type: 'update value',
        value: context.getSdkValue() ?? [],
      })
    },
    'push to sdk': () => {
      throw new Error('push to sdk must be provided via .provide()')
    },
    'apply sync': ({context}) => {
      applySync({
        editor: context.editor,
        getSdkValue: context.getSdkValue,
      })
    },
    'defer then apply sync': ({context}) => {
      queueMicrotask(() => {
        applySync({
          editor: context.editor,
          getSdkValue: context.getSdkValue,
        })
      })
    },
  },
  actors: {
    'listen to editor': listenToEditor,
    'listen to sdk': listenToSdk,
  },
}).createMachine({
  id: 'sdk value',
  context: ({input}) => {
    const {getCurrent: getSdkValue} = getDocumentState<PortableTextBlock[]>(
      input.instance,
      input.handle,
    )

    return {
      editor: input.editor,
      instance: input.instance,
      handle: input.handle,
      getSdkValue,
    }
  },
  entry: ['send initial value'],
  invoke: [
    {
      src: 'listen to editor',
      input: ({context}) => ({editor: context.editor}),
    },
    {
      src: 'listen to sdk',
      input: ({context}) => ({
        instance: context.instance,
        handle: context.handle,
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
        'sdk value changed': {
          actions: ['apply sync'],
        },
      },
    },
    'local write': {
      on: {
        'patch emitted': {},
        'mutation flushed': {
          target: 'pushing to sdk',
          actions: ['push to sdk'],
        },
        'sdk value changed': {
          target: 'pending sync',
        },
      },
    },
    'pushing to sdk': {
      on: {
        'patch emitted': {
          target: 'local write',
        },
        'sdk value changed': {
          target: 'idle',
        },
      },
    },
    'pending sync': {
      on: {
        'patch emitted': {},
        'mutation flushed': {
          target: 'pushing to sdk',
          actions: ['push to sdk', 'defer then apply sync'],
        },
        'sdk value changed': {},
      },
    },
  },
})

/**
 * @public
 */
export function SDKValuePlugin(props: SDKValuePluginProps) {
  const {documentId, documentType, path} = props
  const setSdkValue = useEditDocument(props)
  const instance = useSanityInstance(props)
  const editor = useEditor()

  useActorRef(
    sdkValueMachine.provide({
      actions: {
        'push to sdk': ({context, event}) => {
          if (event.type !== 'mutation flushed') {
            return
          }

          setSdkValue(event.value ?? context.editor.getSnapshot().context.value)
        },
      },
    }),
    {
      input: {
        editor,
        instance,
        handle: {documentId, documentType, path},
      },
    },
  )

  return null
}
