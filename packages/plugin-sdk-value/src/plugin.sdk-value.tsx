import {
  useEditor,
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
import {useEffect} from 'react'

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
/**
 * @public
 */
export function SDKValuePlugin(props: SDKValuePluginProps) {
  const {documentId, documentType, path} = props
  // NOTE: the real `useEditDocument` suspends until the document is loaded into the SDK store
  const setSdkValue = useEditDocument(props)
  const instance = useSanityInstance(props)
  const editor = useEditor()

  useEffect(() => {
    const handle = {documentId, documentType, path}
    const getEditorValue = () => editor.getSnapshot().context.value
    const {getCurrent: getSdkValue, subscribe: onSdkValueChange} =
      getDocumentState<PortableTextBlock[]>(instance, handle)

    let isLocalWrite = false

    const editorSubscription = editor.on('mutation', (event) => {
      isLocalWrite = true
      setSdkValue(event.value ?? getEditorValue())
      isLocalWrite = false
    })
    const unsubscribeToEditorChanges = () => editorSubscription.unsubscribe()
    const unsubscribeToSdkChanges = onSdkValueChange(() => {
      if (isLocalWrite) {
        return
      }

      const snapshot = getEditorValue()
      const patches = convertPatches(diffValue(snapshot, getSdkValue()))

      if (patches.length) {
        editor.send({type: 'patches', patches, snapshot})
      }
    })

    // update initial value
    editor.send({type: 'update value', value: getSdkValue() ?? []})

    return () => {
      unsubscribeToEditorChanges()
      unsubscribeToSdkChanges()
    }
  }, [editor, instance, documentId, documentType, path, setSdkValue])

  return null
}
