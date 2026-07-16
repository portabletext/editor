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
  editDocument,
  getDocumentState,
  subscribeDocumentEvents,
  useApplyDocumentActions,
  useEditDocument,
  useSanityInstance,
  type DocumentHandle,
  type EditDocumentAction,
} from '@sanity/sdk-react'
import {useActorRef} from '@xstate/react'
import {useCallback} from 'react'
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

const STRINGIFY_ERROR_MESSAGE =
  'Unable to convert an editor patch path to a Sanity path expression.'

/**
 * Converts a Portable Text Editor patch path (an array of segments) into a
 * Sanity json-match path expression. The inverse of `arrayifyPath`.
 *
 * @internal
 */
export function stringifyPatchPath(path: Path): string {
  let result = ''
  for (const segment of path) {
    if (typeof segment === 'string') {
      result = result === '' ? segment : `${result}.${segment}`
    } else if (typeof segment === 'number') {
      result = `${result}[${segment}]`
    } else if (
      typeof segment === 'object' &&
      segment !== null &&
      '_key' in segment
    ) {
      result = `${result}[_key=="${segment._key}"]`
    } else {
      throw new Error(STRINGIFY_ERROR_MESSAGE)
    }
  }
  return result
}

function prefixPathExpression(prefix: string, expression: string): string {
  if (expression === '') {
    return prefix
  }
  return expression.startsWith('[')
    ? `${prefix}${expression}`
    : `${prefix}.${expression}`
}

/**
 * `SanityPatchOperations` from `@sanity/diff-patch` only covers the
 * operations `diffValue` emits; the editor can additionally produce these.
 */
type SanityPatchOperationsWithExtras = SanityPatchOperations & {
  setIfMissing?: {[path: string]: unknown}
  inc?: {[path: string]: number}
  dec?: {[path: string]: number}
}

/**
 * Converts Portable Text Editor patches into Sanity patch operations rooted
 * at the given document field path. Throws if a patch cannot be converted;
 * callers should fall back to pushing the whole value.
 *
 * @internal
 */
export function convertPatchesToSanity(
  patches: PtePatch[],
  options: {prefix: string},
): SanityPatchOperationsWithExtras[] {
  return patches.map((patch): SanityPatchOperationsWithExtras => {
    const pathExpression = prefixPathExpression(
      options.prefix,
      stringifyPatchPath(patch.path),
    )

    switch (patch.type) {
      case 'set':
        return {set: {[pathExpression]: patch.value}}
      case 'setIfMissing':
        return {setIfMissing: {[pathExpression]: patch.value}}
      case 'diffMatchPatch':
        return {diffMatchPatch: {[pathExpression]: patch.value}}
      case 'inc':
        return {inc: {[pathExpression]: patch.value as number}}
      case 'dec':
        return {dec: {[pathExpression]: patch.value as number}}
      case 'unset':
        return {unset: [pathExpression]}
      case 'insert':
        return {
          insert: {
            [patch.position]: pathExpression,
            items: patch.items,
          } as SanityPatchOperations['insert'],
        }
      default:
        throw new Error(STRINGIFY_ERROR_MESSAGE)
    }
  })
}

function segmentsEqual(a: PathSegment, b: PathSegment): boolean {
  if (typeof a === 'string' || typeof a === 'number') {
    return a === b
  }
  if (typeof b === 'string' || typeof b === 'number') {
    return false
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return false
  }
  return a._key === b._key
}

/**
 * Scopes document-rooted Sanity patches to the given field path, returning
 * field-relative Portable Text Editor patches. Patches outside the field are
 * dropped. Returns `null` when the field (or an ancestor of it) is replaced
 * wholesale, in which case the caller should fall back to a full value sync.
 * Throws when a path expression cannot be converted.
 *
 * @internal
 */
export function scopeRemotePatches(
  patches: SanityPatchOperations[],
  fieldPath: string,
): PtePatch[] | null {
  const prefix = arrayifyPath(fieldPath)
  const converted = convertPatches(patches)
  const scoped: PtePatch[] = []

  for (const patch of converted) {
    const overlap = Math.min(patch.path.length, prefix.length)
    let touchesField = true
    for (let index = 0; index < overlap; index++) {
      if (!segmentsEqual(patch.path[index], prefix[index])) {
        touchesField = false
        break
      }
    }
    if (!touchesField) {
      continue
    }
    if (patch.path.length <= prefix.length) {
      // the patch targets the field itself or an ancestor of it, which
      // cannot be expressed as a field-relative operation
      return null
    }
    scoped.push({...patch, path: patch.path.slice(prefix.length)})
  }

  return scoped
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
      sendBack({
        type: 'mutation flushed',
        value: event.value,
        patches: event.patches,
      })
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

const listenToRemotePatches = fromCallback<
  AnyEventObject,
  {onRemotePatches: ValueSyncConfig['onRemotePatches']}
>(({sendBack, input}) => {
  return input.onRemotePatches?.((patches) => {
    sendBack({type: 'remote patches received', patches})
  })
})

const valueSyncMachine = setup({
  types: {
    context: {} as {
      editor: Editor
      getRemoteValue: ValueSyncConfig['getRemoteValue']
      onRemoteValueChange: ValueSyncConfig['onRemoteValueChange']
      onRemotePatches: ValueSyncConfig['onRemotePatches']
    },
    input: {} as {
      editor: Editor
      getRemoteValue: ValueSyncConfig['getRemoteValue']
      onRemoteValueChange: ValueSyncConfig['onRemoteValueChange']
      onRemotePatches: ValueSyncConfig['onRemotePatches']
    },
    events: {} as
      | {type: 'patch emitted'}
      | {
          type: 'mutation flushed'
          value: PortableTextBlock[] | undefined
          patches: PtePatch[]
        }
      | {type: 'remote value changed'}
      | {type: 'remote patches received'; patches: PtePatch[]},
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
    'apply remote patches': ({context, event}) => {
      if (event.type !== 'remote patches received') {
        return
      }
      if (event.patches.length === 0) {
        return
      }
      context.editor.send({
        type: 'patches',
        patches: event.patches,
        snapshot: context.editor.getSnapshot().context.value,
      })
    },
  },
  actors: {
    'listen to editor': listenToEditor,
    'listen to remote': listenToRemote,
    'listen to remote patches': listenToRemotePatches,
  },
}).createMachine({
  id: 'value sync',
  context: ({input}) => ({
    editor: input.editor,
    getRemoteValue: input.getRemoteValue,
    onRemoteValueChange: input.onRemoteValueChange,
    onRemotePatches: input.onRemotePatches,
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
    {
      src: 'listen to remote patches',
      input: ({context}) => ({
        onRemotePatches: context.onRemotePatches,
      }),
    },
  ],
  // operational patches from other clients apply immediately in every state;
  // the editor merges them with any in-flight local changes
  on: {
    'remote patches received': {
      actions: ['apply remote patches'],
    },
  },
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
 * The shape of the `remote-patches` document event emitted by
 * `@sanity/sdk` >= 2.17. Declared structurally so the plugin stays
 * compatible with older SDK typings until its dependency is bumped.
 */
type RemotePatchesDocumentEvent = {
  type: 'remote-patches'
  documentId: string
  transactionId: string
  timestamp: string
  previousRev?: string
  patches: SanityPatchOperations[]
  origin: 'local' | 'remote'
}

function isRemotePatchesEvent(event: {
  type: string
}): event is RemotePatchesDocumentEvent {
  return event.type === 'remote-patches'
}

function getPublishedDocumentId(id: string): string {
  if (id.startsWith('drafts.')) {
    return id.slice('drafts.'.length)
  }
  if (id.startsWith('versions.')) {
    return id.split('.').slice(2).join('.')
  }
  return id
}

/**
 * @public
 */
export function SDKValuePlugin(props: SDKValuePluginProps) {
  const {documentId, documentType, path} = props
  const setSdkValue = useEditDocument(props)
  const instance = useSanityInstance(props)
  const applyActions = useApplyDocumentActions()

  const handle = {documentId, documentType, path}
  const {getCurrent, subscribe} = getDocumentState<PortableTextBlock[]>(
    instance,
    handle,
  )

  const onRemotePatches = useCallback(
    (callback: (patches: PtePatch[]) => void) => {
      return subscribeDocumentEvents(instance, {
        eventHandler: (event) => {
          // widen before narrowing: `remote-patches` is not part of the
          // `DocumentEvent` union in older SDK typings
          const candidate: {type: string} = event
          if (!isRemotePatchesEvent(candidate)) {
            return
          }
          // our own transactions are already reflected in the editor
          if (candidate.origin !== 'remote') {
            return
          }
          if (
            getPublishedDocumentId(candidate.documentId) !==
            getPublishedDocumentId(documentId)
          ) {
            return
          }

          let patches: PtePatch[] | null
          try {
            patches = scopeRemotePatches(candidate.patches, path)
          } catch {
            // unconvertible patch shapes fall back to the whole-value sync
            // driven by `onRemoteValueChange`
            return
          }
          if (patches && patches.length > 0) {
            callback(patches)
          }
        },
      })
    },
    [instance, documentId, path],
  )

  const pushPatches = useCallback(
    (patches: PtePatch[]) => {
      const sanityPatches = convertPatchesToSanity(patches, {prefix: path})
      // `preserveOperations` ships in @sanity/sdk >= 2.17; the intersection
      // type keeps the plugin compatible with older SDK typings
      const action: EditDocumentAction & {preserveOperations?: boolean} = {
        ...editDocument(
          {documentId, documentType},
          sanityPatches as Parameters<typeof editDocument>[1],
        ),
        preserveOperations: true,
      }
      applyActions(action)
    },
    [applyActions, documentId, documentType, path],
  )

  return (
    <ValueSyncPlugin
      getRemoteValue={getCurrent}
      pushValue={setSdkValue}
      onRemoteValueChange={subscribe}
      onRemotePatches={onRemotePatches}
      pushPatches={pushPatches}
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
  /**
   * Optional patch channel. When provided, operational patches from other
   * clients are applied directly to the editor (in every state) instead of
   * waiting for a whole-value diff, and local editor patches are pushed
   * through `pushPatches`. The whole-value sync remains as a fallback for
   * anything the patch channel cannot express.
   */
  onRemotePatches?: (
    callback: (patches: PtePatch[]) => void,
  ) => (() => void) | undefined
  /**
   * Pushes the editor's own operational patches to the remote store. May
   * throw when a patch cannot be converted, in which case the plugin falls
   * back to pushing the whole value.
   */
  pushPatches?: (patches: PtePatch[]) => void
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
  const {
    getRemoteValue,
    pushValue,
    onRemoteValueChange,
    onRemotePatches,
    pushPatches,
  } = props
  const editor = useEditor()

  useActorRef(
    valueSyncMachine.provide({
      actions: {
        'push to remote': ({context, event}) => {
          if (event.type !== 'mutation flushed') {
            return
          }

          if (pushPatches && event.patches.length > 0) {
            try {
              pushPatches(event.patches)
              return
            } catch {
              // fall back to pushing the whole value below
            }
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
        onRemotePatches,
      },
    },
  )

  return null
}
