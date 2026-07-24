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
import {debug} from './debug'

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
      case 'unset':
        // The editor unsets the whole field when it becomes empty. Write an
        // empty array instead: unsetting the field would leave other clients
        // unable to reconcile against it (their remote value disappears).
        if (patch.path.length === 0) {
          return {set: {[pathExpression]: []}}
        }
        return {unset: [pathExpression]}
      case 'diffMatchPatch':
        return {diffMatchPatch: {[pathExpression]: patch.value}}
      case 'inc':
        return {inc: {[pathExpression]: patch.value as number}}
      case 'dec':
        return {dec: {[pathExpression]: patch.value as number}}
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

function pathsEqual(a: Path, b: Path): boolean {
  return (
    a.length === b.length &&
    a.every((segment, index) => segmentsEqual(segment, b[index]))
  )
}

/**
 * The editor engine can only resolve keyed/indexed segments against the
 * root block array and (possibly nested) `children` arrays. Operations
 * that address items of any other array, e.g. a block's `markDefs` or a
 * span's `marks`, misapply. When a patch path enters such a sidecar
 * array, this returns the path of the array itself so callers can fall
 * back to replacing the whole property; returns `null` for paths the
 * engine can apply.
 *
 * @internal
 */
export function findSidecarArrayPath(path: Path): Path | null {
  // a keyed/numeric segment is only resolvable first (root block array)
  // or directly after a `children` property
  let expectNode = true
  for (let index = 0; index < path.length; index++) {
    const segment = path[index]
    if (typeof segment === 'string') {
      expectNode = segment === 'children'
    } else {
      if (!expectNode) {
        return path.slice(0, index)
      }
      expectNode = false
    }
  }
  return null
}

function getValueAtPath(value: JSONValue, path: Path): JSONValue | undefined {
  let current: JSONValue | undefined = value
  for (const segment of path) {
    if (current === null || current === undefined) {
      return undefined
    }
    if (typeof segment === 'number') {
      if (!Array.isArray(current)) {
        return undefined
      }
      current = current[segment < 0 ? current.length + segment : segment]
    } else if (typeof segment === 'string') {
      if (typeof current !== 'object' || Array.isArray(current)) {
        return undefined
      }
      current = (current as {[key: string]: JSONValue})[segment]
    } else if (Array.isArray(segment)) {
      // index tuples address ranges, not single values
      return undefined
    } else {
      if (!Array.isArray(current)) {
        return undefined
      }
      current = current.find(
        (item) =>
          typeof item === 'object' &&
          item !== null &&
          !Array.isArray(item) &&
          (item as {_key?: unknown})._key === segment._key,
      )
    }
  }
  return current
}

/**
 * Converts a target-value diff into patches the editor engine can apply.
 * Patches addressing items inside sidecar arrays are coalesced into whole
 * `set`s (or `unset`s) of the owning property, taken from the target
 * value.
 *
 * @internal
 */
export function toEngineSafePatches(
  patches: PtePatch[],
  targetValue: PortableTextBlock[],
): PtePatch[] {
  const safe: PtePatch[] = []
  const sidecarPaths: Path[] = []

  for (const patch of patches) {
    const sidecarPath = findSidecarArrayPath(patch.path)
    if (!sidecarPath) {
      safe.push(patch)
      continue
    }
    if (!sidecarPaths.some((existing) => pathsEqual(existing, sidecarPath))) {
      sidecarPaths.push(sidecarPath)
    }
  }

  for (const sidecarPath of sidecarPaths) {
    const value = getValueAtPath(
      targetValue as unknown as JSONValue,
      sidecarPath,
    )
    safe.push(
      value === undefined
        ? {type: 'unset', path: sidecarPath, origin: 'remote'}
        : {type: 'set', path: sidecarPath, value, origin: 'remote'},
    )
  }

  return safe
}

/**
 * A text paste can stage a temporary span and remove it in the same local
 * flush. The SDK may emit the insert before that cleanup even though its
 * current value already reflects the completed transaction.
 */
function filterInsertsMissingFromRemoteValue(
  patches: PtePatch[],
  remoteValue: PortableTextBlock[],
): PtePatch[] {
  return patches.flatMap((patch): PtePatch[] => {
    if (patch.type !== 'insert') {
      return [patch]
    }

    const parentValue = getValueAtPath(
      remoteValue as unknown as JSONValue,
      patch.path.slice(0, -1),
    )
    if (!Array.isArray(parentValue)) {
      return [patch]
    }

    const items = patch.items.filter((item) => {
      const itemKey = getKey(item)
      if (!itemKey) {
        return true
      }
      return parentValue.some((candidate) => getKey(candidate) === itemKey)
    })

    return items.length > 0 ? [{...patch, items}] : []
  })
}

function getKey(value: JSONValue): string | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined
  }
  const key = (value as {_key?: unknown})._key
  return typeof key === 'string' ? key : undefined
}

/**
 * The editor writes `markDefs` as whole-array `set`s. Two clients
 * formatting the same block concurrently then overwrite each other's
 * arrays at the server (last writer wins) while both clients' span
 * `marks` references survive, stranding marks without definitions.
 * Outgoing `markDefs` sets are therefore decomposed into item-level
 * operations against the store (server truth): new definitions insert,
 * changed definitions set by key, and removed definitions unset by key.
 * Item-keyed operations merge at the server instead of overwriting.
 *
 * A definition is never unset while something observable still
 * references it: the store's own spans (a diverged client's normalizer
 * prunes those spuriously), the editor's current spans, or any other
 * patch in the same flush (a toggle's intermediate states can prune a
 * definition that a later operation in the same flush re-references).
 * Pushing such an unset persists invalid Portable Text (a mark with no
 * definition); an unused definition left behind is valid and a later,
 * converged flush removes it for real.
 *
 * The mirror hazard is guarded too: a flush that writes span marks
 * referencing a definition the store no longer has (another client
 * removed it while this client's reference was in flight) re-inserts
 * that definition from the editor's block, so the transaction leaves
 * the document self-consistent.
 *
 * @internal
 */
export function toMergeableMarkDefsPatches(
  patches: PtePatch[],
  getCurrentValue: () => PortableTextBlock[] | null | undefined,
  getEditorValue?: () => PortableTextBlock[] | null | undefined,
): PtePatch[] {
  // Marks referenced anywhere else in this flush. String matching over
  // the serialized patches over-collects, which is safe: a kept
  // definition is valid Portable Text, a stranded mark is not.
  const flushJson = JSON.stringify(
    patches.filter(
      (patch) => !(patch.type === 'set' && patch.path.at(-1) === 'markDefs'),
    ),
  )
  const editorValue = getEditorValue?.()

  const decomposed = patches.flatMap((patch): PtePatch[] => {
    if (
      patch.type !== 'set' ||
      patch.path.at(-1) !== 'markDefs' ||
      !Array.isArray(patch.value)
    ) {
      return [patch]
    }
    const currentValue = getCurrentValue()
    if (!currentValue) {
      return [patch]
    }
    const root = currentValue as unknown as JSONValue
    const storeMarkDefs = getValueAtPath(root, patch.path)
    const storeBlock = getValueAtPath(root, patch.path.slice(0, -1))
    if (
      !Array.isArray(storeMarkDefs) ||
      typeof storeBlock !== 'object' ||
      storeBlock === null
    ) {
      return [patch]
    }

    const local = patch.value as Array<{_key?: string}>
    const store = storeMarkDefs as Array<{_key?: string}>
    if (local.some((item) => item._key === undefined)) {
      return [patch]
    }

    const editorBlock = editorValue
      ? getValueAtPath(
          editorValue as unknown as JSONValue,
          patch.path.slice(0, -1),
        )
      : undefined
    const referencedKeys = new Set([
      ...(
        (storeBlock as {children?: Array<{marks?: string[]}>}).children ?? []
      ).flatMap((child) => child.marks ?? []),
      ...(
        (editorBlock as {children?: Array<{marks?: string[]}>})?.children ?? []
      ).flatMap((child) => child.marks ?? []),
    ])
    const storeByKey = new Map(store.map((item) => [item._key, item]))
    const localKeys = new Set(local.map((item) => item._key))
    const origin = patch.origin

    const ops: PtePatch[] = []

    const inserted = local.filter((item) => !storeByKey.has(item._key))
    if (inserted.length > 0) {
      ops.push({
        type: 'insert',
        origin,
        position: 'after',
        path: [...patch.path, -1],
        items: inserted as JSONValue[],
      })
    }

    for (const item of local) {
      const existing = storeByKey.get(item._key)
      if (existing && JSON.stringify(existing) !== JSON.stringify(item)) {
        ops.push({
          type: 'set',
          origin,
          path: [...patch.path, {_key: item._key as string}],
          value: item as JSONValue,
        })
      }
    }

    for (const item of store) {
      if (
        item._key !== undefined &&
        !localKeys.has(item._key) &&
        !referencedKeys.has(item._key) &&
        !flushJson.includes(`"${item._key}"`)
      ) {
        ops.push({
          type: 'unset',
          origin,
          path: [...patch.path, {_key: item._key}],
        })
      }
    }

    return ops
  })

  return [
    ...missingDefinitionInserts(
      patches,
      decomposed,
      getCurrentValue(),
      editorValue,
    ),
    ...decomposed,
  ]
}

/**
 * Definitions to re-insert for marks this flush writes but the store no
 * longer defines. See `toMergeableMarkDefsPatches`.
 */
function missingDefinitionInserts(
  patches: PtePatch[],
  decomposed: PtePatch[],
  currentValue: PortableTextBlock[] | null | undefined,
  editorValue: PortableTextBlock[] | null | undefined,
): PtePatch[] {
  if (!currentValue || !editorValue) {
    return []
  }

  const referencedByBlock = collectWrittenMarkReferences(patches)
  if (referencedByBlock.size === 0) {
    return []
  }

  const flushDefinesKey = (key: string) =>
    decomposed.some(
      (patch) =>
        patch.path.includes('markDefs') &&
        ((patch.type === 'insert' &&
          JSON.stringify(patch.items).includes(`"${key}"`)) ||
          (patch.type === 'set' &&
            JSON.stringify(patch.value).includes(`"${key}"`))),
    )

  const inserts: PtePatch[] = []

  for (const [blockKey, markKeys] of referencedByBlock) {
    const markDefsPath: Path = [{_key: blockKey}, 'markDefs']
    const storeMarkDefs = getValueAtPath(
      currentValue as unknown as JSONValue,
      markDefsPath,
    )
    if (!Array.isArray(storeMarkDefs)) {
      // The block (or its `markDefs`) is not at the store yet; the flush
      // that creates it carries the definitions itself.
      continue
    }
    const storeKeys = new Set(
      (storeMarkDefs as Array<{_key?: string}>).map((item) => item._key),
    )
    const editorMarkDefs = getValueAtPath(
      editorValue as unknown as JSONValue,
      markDefsPath,
    )
    const editorDefsByKey = new Map(
      (Array.isArray(editorMarkDefs)
        ? (editorMarkDefs as Array<{_key?: string}>)
        : []
      ).map((item) => [item._key, item]),
    )

    const missing: JSONValue[] = []
    for (const markKey of markKeys) {
      if (storeKeys.has(markKey) || flushDefinesKey(markKey)) {
        continue
      }
      const definition = editorDefsByKey.get(markKey)
      if (definition) {
        // Decorator marks never resolve here: they have no definition.
        missing.push(definition as JSONValue)
      }
    }

    if (missing.length > 0) {
      inserts.push({
        type: 'insert',
        origin: 'local',
        position: 'after',
        path: [...markDefsPath, -1],
        items: missing,
      })
    }
  }

  return inserts
}

/**
 * Annotation keys the given patches write into span `marks`, grouped by
 * block key. Covers direct `marks` sets, span inserts, whole-`children`
 * sets, and whole-block sets.
 */
function collectWrittenMarkReferences(
  patches: PtePatch[],
): Map<string, Set<string>> {
  const referencedByBlock = new Map<string, Set<string>>()

  const add = (blockKey: string, marks: unknown) => {
    if (!Array.isArray(marks)) {
      return
    }
    let keys = referencedByBlock.get(blockKey)
    if (!keys) {
      keys = new Set()
      referencedByBlock.set(blockKey, keys)
    }
    for (const mark of marks) {
      if (typeof mark === 'string') {
        keys.add(mark)
      }
    }
  }

  const addChildren = (blockKey: string, children: unknown) => {
    if (!Array.isArray(children)) {
      return
    }
    for (const child of children) {
      if (typeof child === 'object' && child !== null) {
        add(blockKey, (child as {marks?: unknown}).marks)
      }
    }
  }

  for (const patch of patches) {
    const blockSegment = patch.path[0]
    const blockKey =
      typeof blockSegment === 'object' &&
      blockSegment !== null &&
      '_key' in blockSegment
        ? blockSegment._key
        : undefined
    if (blockKey === undefined) {
      continue
    }

    if (patch.type === 'set') {
      if (patch.path.at(-1) === 'marks') {
        add(blockKey, patch.value)
      } else if (patch.path.at(-1) === 'children') {
        addChildren(blockKey, patch.value)
      } else if (patch.path.length === 1) {
        addChildren(blockKey, (patch.value as {children?: unknown})?.children)
      }
    } else if (patch.type === 'insert' && patch.path[1] === 'children') {
      addChildren(blockKey, patch.items)
    }
  }

  return referencedByBlock
}

/**
 * Whether a remote patch can resolve against the given editor value.
 * Concurrent edits routinely produce operations addressing nodes another
 * client has already removed or not yet created; sending those into the
 * engine fails loudly (console errors) before being skipped. Callers drop
 * unresolvable patches up front and rely on the follow-up repair sync to
 * converge instead.
 *
 * @internal
 */
export function canApplyToValue(
  patch: PtePatch,
  value: PortableTextBlock[] | undefined,
): boolean {
  if (!value) {
    return true
  }
  const root = value as unknown as JSONValue
  switch (patch.type) {
    // unset needs the node itself; insert needs the sibling at `path`;
    // diffMatchPatch needs the existing string
    case 'unset':
    case 'insert':
    case 'diffMatchPatch':
      return getValueAtPath(root, patch.path) !== undefined
    // set creates its target property, so only the parent must resolve
    case 'set':
      return (
        patch.path.length === 0 ||
        getValueAtPath(root, patch.path.slice(0, -1)) !== undefined
      )
    default:
      return true
  }
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

function debugTextOf(value: unknown): string {
  if (!Array.isArray(value)) {
    return ''
  }
  return value
    .map((block) =>
      Array.isArray((block as {children?: unknown}).children)
        ? ((block as {children: Array<{text?: string}>}).children ?? [])
            .map((child) => child.text ?? '')
            .join('')
        : '',
    )
    .join('\n')
}

/**
 * How long an editor-versus-store divergence must persist, unchanged,
 * before the whole-value repair acts on it. When a remote transaction
 * arrives interleaved with the listener echoes of this client's own recent
 * edits, the store value is transiently wrong until the echo returns and
 * the rebase corrects it. A repair fired inside that window copies the
 * garbage into the editor and a follow-up repair restores the text at a
 * drifted offset, scrambling words the user typed in the meantime. The
 * window therefore has to outlast a slow listener echo round trip; real
 * divergence is stable and loses nothing by being repaired a beat later.
 *
 * Tests use a short window: their mock stores are synchronous, so echo
 * transients cannot occur, and waiting the production interval would only
 * slow every repair assertion down.
 */
const REPAIR_CONFIRM_DELAY =
  // @ts-expect-error - dot notation required for Vite to replace at build time
  process.env.NODE_ENV === 'test' ? 150 : 1000

type PendingRepair = {signature: string; timer: ReturnType<typeof setTimeout>}
const pendingRepairs = new WeakMap<Editor, PendingRepair>()

/**
 * Local edits the editor has emitted but not yet flushed into a mutation.
 * While any exist, the store necessarily lags the editor and a repair diff
 * would "repair away" the user's unflushed keystrokes, so repairs must wait.
 */
const unflushedEdits = new WeakMap<Editor, boolean>()

/**
 * Every `markDefs` key this session has observed, at the store or in the
 * editor. A span mark matching one of these keys is an annotation
 * reference; when its definition is missing from the block, the document
 * holds invalid Portable Text (concurrent editing can remove a definition
 * while another client's reference is in flight). Marks that never
 * appeared in `markDefs` are left alone: they may be decorators from a
 * schema this editor doesn't know, which are supported and must survive.
 */
const knownAnnotationKeys = new WeakMap<Editor, Set<string>>()

function recordAnnotationKeys(
  editor: Editor,
  values: Array<PortableTextBlock[] | null | undefined>,
): void {
  let keys = knownAnnotationKeys.get(editor)
  if (!keys) {
    keys = new Set()
    knownAnnotationKeys.set(editor, keys)
  }
  for (const value of values) {
    for (const block of value ?? []) {
      const markDefs = (block as {markDefs?: Array<{_key?: string}>}).markDefs
      if (!Array.isArray(markDefs)) {
        continue
      }
      for (const markDef of markDefs) {
        if (typeof markDef._key === 'string') {
          keys.add(markDef._key)
        }
      }
    }
  }
}

/**
 * Patches that remove stranded annotation references from the given
 * value: span marks whose key is a known `markDefs` key but has no
 * definition on the block. Empty when the value is valid.
 */
function findOrphanedMarkCleanups(
  editor: Editor,
  value: PortableTextBlock[],
): PtePatch[] {
  const known = knownAnnotationKeys.get(editor)
  if (!known || known.size === 0) {
    return []
  }

  const cleanups: PtePatch[] = []

  for (const block of value) {
    const {
      _key: blockKey,
      markDefs,
      children,
    } = block as {
      _key?: string
      markDefs?: Array<{_key?: string}>
      children?: Array<{_key?: string; marks?: unknown}>
    }
    if (typeof blockKey !== 'string' || !Array.isArray(children)) {
      continue
    }
    const definedKeys = new Set(
      (Array.isArray(markDefs) ? markDefs : []).map((markDef) => markDef._key),
    )
    for (const child of children) {
      if (typeof child._key !== 'string' || !Array.isArray(child.marks)) {
        continue
      }
      const marks = child.marks.filter(
        (mark): mark is string => typeof mark === 'string',
      )
      const orphaned = marks.filter(
        (mark) => known.has(mark) && !definedKeys.has(mark),
      )
      if (orphaned.length > 0) {
        cleanups.push({
          type: 'set',
          origin: 'local',
          path: [{_key: blockKey}, 'children', {_key: child._key}, 'marks'],
          value: marks.filter((mark) => !orphaned.includes(mark)),
        })
      }
    }
  }

  return cleanups
}

/**
 * Removes stranded annotation references the (stable, confirmed) store
 * value holds, both at the document and in the local editor. See
 * `findOrphanedMarkCleanups`. Runs on the confirmed-repair paths only,
 * so any in-flight definition insert has had the confirm window to land.
 */
function healStrandedMarks(
  editor: Editor,
  value: PortableTextBlock[],
  pushPatches: ((patches: PtePatch[]) => void) | undefined,
): void {
  if (!pushPatches) {
    return
  }
  const cleanups = findOrphanedMarkCleanups(editor, value)
  if (cleanups.length === 0) {
    return
  }
  debug.repair('removing stranded annotation marks %o', cleanups)
  try {
    pushPatches(cleanups)
  } catch {
    return
  }
  editor.send({
    type: 'patches',
    patches: cleanups.map((patch) => ({...patch, origin: 'remote'})),
    snapshot: editor.getSnapshot().context.value,
  })
}

function computeRepair(
  editor: Editor,
  remoteValue: PortableTextBlock[],
): {patches: PtePatch[]; convertible: boolean; signature: string} {
  const snapshot = editor.getSnapshot().context.value
  // The signature covers the full (editor, store) state, not just the diff:
  // with repetitive text, two different transients can produce an identical
  // diff, and a repair must only act when the world actually stood still.
  const stateSignature = JSON.stringify([snapshot, remoteValue])
  try {
    const patches = toEngineSafePatches(
      convertPatches(diffValue(snapshot, remoteValue)),
      remoteValue,
    )
    return {patches, convertible: true, signature: stateSignature}
  } catch {
    // diffValue can emit path shapes the converter does not understand
    // (e.g. array slices when multiple items are dropped). The repair then
    // has to fall back to a whole-value update.
    return {patches: [], convertible: false, signature: `!${stateSignature}`}
  }
}

function cancelPendingRepair(editor: Editor) {
  const pending = pendingRepairs.get(editor)
  if (pending) {
    clearTimeout(pending.timer)
    pendingRepairs.delete(editor)
  }
}

/**
 * Whether the editor shows the placeholder it keeps when the document is
 * empty: a single text block holding a single empty, unmarked span. The
 * placeholder's keys are minted locally, so it can never equal an empty
 * document value in a diff. Both states mean "empty document".
 */
function isEmptyPlaceholderValue(editor: Editor): boolean {
  const value = editor.getSnapshot().context.value
  if (value.length !== 1) {
    return false
  }
  const block = value[0] as {
    markDefs?: unknown[]
    children?: Array<{text?: string; marks?: unknown[]}>
  }
  if (!Array.isArray(block.children) || block.children.length !== 1) {
    return false
  }
  if (Array.isArray(block.markDefs) && block.markDefs.length > 0) {
    return false
  }
  const child = block.children[0]!
  return child.text === '' && (child.marks ?? []).length === 0
}

function applySync({
  editor,
  getRemoteValue,
  pushPatches,
}: {
  editor: Editor
  getRemoteValue: () => PortableTextBlock[] | null | undefined
  pushPatches?: (patches: PtePatch[]) => void
}) {
  const remoteValue = getRemoteValue()

  if (!remoteValue) {
    return
  }

  recordAnnotationKeys(editor, [
    remoteValue,
    editor.getSnapshot().context.value,
  ])

  if (remoteValue.length === 0 && isEmptyPlaceholderValue(editor)) {
    // An empty document and the editor's local placeholder are the same
    // state. Diffing them "repairs" the placeholder away, and the editor
    // re-mints it with fresh keys on every pass, never converging.
    cancelPendingRepair(editor)
    return
  }

  const first = computeRepair(editor, remoteValue)
  if (
    first.convertible &&
    first.patches.length === 0 &&
    (!pushPatches || findOrphanedMarkCleanups(editor, remoteValue).length === 0)
  ) {
    cancelPendingRepair(editor)
    return
  }

  if (debug.repair.enabled) {
    debug.repair('editor and store texts diverged %o', {
      editorText: debugTextOf(editor.getSnapshot().context.value),
      remoteText: debugTextOf(remoteValue),
    })
  }

  // Same divergence already awaiting confirmation: let that timer decide.
  const pending = pendingRepairs.get(editor)
  if (pending && pending.signature === first.signature) {
    return
  }
  cancelPendingRepair(editor)

  const timer = setTimeout(() => {
    pendingRepairs.delete(editor)

    // Unflushed local keystrokes mean the store lags the editor by design;
    // a repair now would delete them. Re-arm and wait for the flush (the
    // divergence either disappears once the push round-trips, or persists
    // and gets repaired then).
    if (unflushedEdits.get(editor)) {
      applySync({editor, getRemoteValue, pushPatches})
      return
    }

    // Recompute from scratch: the store may have corrected itself (the
    // transient case) or the user may have typed (their edits will push
    // and reconverge through the normal flow); only a divergence that is
    // still byte-for-byte identical is real and safe to repair.
    const latestRemote = getRemoteValue()
    if (!latestRemote) {
      return
    }
    const second = computeRepair(editor, latestRemote)
    if (second.signature !== first.signature) {
      // Still diverged but differently: re-arm so a stable state eventually
      // confirms. Transients converge to the empty diff; genuine divergence
      // stabilizes to a fixed signature within one flush cycle.
      applySync({editor, getRemoteValue, pushPatches})
      return
    }
    if (second.convertible && second.patches.length === 0) {
      healStrandedMarks(editor, latestRemote, pushPatches)
      return
    }

    if (latestRemote.length === 0) {
      if (!isEmptyPlaceholderValue(editor)) {
        // Adopt "empty" through the whole-value sync: it empties the
        // first text block in place, keeping its keys, so this editor
        // converges with the client that emptied the document. A patch
        // diff would instead remove the block and re-mint placeholder
        // keys the other client can never match.
        debug.repair('adopting empty document via whole-value sync')
        editor.send({type: 'update value', value: latestRemote})
      }
      return
    }

    if (!second.convertible) {
      debug.repair('escalating to whole-value sync (unconvertible diff)')
      editor.send({type: 'update value', value: latestRemote})
      healStrandedMarks(editor, latestRemote, pushPatches)
      return
    }

    const snapshot = editor.getSnapshot().context.value
    debug.repair('applying confirmed repair patches %o', second.patches)
    editor.send({type: 'patches', patches: second.patches, snapshot})

    // Patch application is best-effort: the editor skips operations it
    // cannot resolve against its current tree, and concurrent edits to the
    // same range produce keyed operations whose targets no longer exist
    // locally. When the editor is still diverged after the diff-based
    // repair, escalate to the full value sync machinery, which reconciles
    // arbitrary divergence block by block.
    const valueAfterPatches = editor.getSnapshot().context.value
    if (diffValue(valueAfterPatches, latestRemote).length > 0) {
      if (debug.repair.enabled) {
        debug.repair('escalating to whole-value sync %o', {
          editorText: debugTextOf(valueAfterPatches),
          remoteText: debugTextOf(latestRemote),
        })
      }
      editor.send({type: 'update value', value: latestRemote})
    }

    healStrandedMarks(editor, latestRemote, pushPatches)
  }, REPAIR_CONFIRM_DELAY)

  pendingRepairs.set(editor, {signature: first.signature, timer})
}

const listenToEditor = fromCallback<AnyEventObject, {editor: Editor}>(
  ({sendBack, input}) => {
    const patchSubscription = input.editor.on('patch', () => {
      // Every 'patch' event is a local edit (remote application suppresses
      // patch generation), so the store now lags the editor until the next
      // mutation flush.
      unflushedEdits.set(input.editor, true)
      sendBack({type: 'patch emitted'})
    })

    const mutationSubscription = input.editor.on('mutation', (event) => {
      unflushedEdits.set(input.editor, false)
      if (debug.mutation.enabled) {
        debug.mutation('flushed %o', {
          flushText: debugTextOf(event.value),
          snapshotText: debugTextOf(input.editor.getSnapshot().context.value),
        })
      }
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

/**
 * How long the machine must sit in 'idle' (no local keystrokes, no store
 * events) before the one-shot whole-value repair runs. Long enough for the
 * editor's external value snapshot to catch up after the last flush; short
 * enough that residual divergence from concurrent editing heals promptly.
 */
const QUIESCENT_REPAIR_DELAY = 500

const valueSyncMachine = setup({
  types: {
    context: {} as {
      editor: Editor
      getRemoteValue: ValueSyncConfig['getRemoteValue']
      onRemoteValueChange: ValueSyncConfig['onRemoteValueChange']
      onRemotePatches: ValueSyncConfig['onRemotePatches']
      pushPatches: ValueSyncConfig['pushPatches']
    },
    input: {} as {
      editor: Editor
      getRemoteValue: ValueSyncConfig['getRemoteValue']
      onRemoteValueChange: ValueSyncConfig['onRemoteValueChange']
      onRemotePatches: ValueSyncConfig['onRemotePatches']
      pushPatches: ValueSyncConfig['pushPatches']
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
        pushPatches: context.pushPatches,
      })
    },
    'apply remote patches': ({context, event}) => {
      if (event.type !== 'remote patches received') {
        return
      }
      debug.remote('applying remote patches %o', event.patches)
      const snapshot = context.editor.getSnapshot().context.value
      // The store already reflects this transaction, so it can serve as
      // the target for coalescing sidecar-array item operations (which
      // the engine misroutes) into whole-property sets.
      const remoteValue = context.getRemoteValue()
      const coalesced = remoteValue
        ? toEngineSafePatches(event.patches, remoteValue)
        : event.patches
      const patches = (
        remoteValue
          ? filterInsertsMissingFromRemoteValue(coalesced, remoteValue)
          : coalesced
      ).filter((patch) => canApplyToValue(patch, snapshot))
      if (patches.length === 0) {
        return
      }
      context.editor.send({type: 'patches', patches, snapshot})
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
    pushPatches: input.pushPatches,
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
  // Two invariants, learned the hard way:
  //
  // 1. EVERY 'mutation flushed' event must be pushed, in every state. The
  //    editor emits mutation events in bursts (one per input batch, e.g.
  //    each backspace of a quick delete), and any state without a handler
  //    silently drops the flush. A dropped flush permanently diverges the
  //    store from the editor, and the whole-value repair then "heals" the
  //    editor backwards, resurrecting deleted text.
  // 2. The whole-value repair must only run when no local edits can be in
  //    flight (quiescent 'idle'). Running it mid-typing diffs the editor
  //    against a store that lags the user's keystrokes and stomps them.
  //
  // Operational patches from other clients still apply immediately in
  // every state; the editor merges them with in-flight local changes.
  initial: 'idle',
  states: {
    'idle': {
      // One-shot repair after a quiet period. Covers divergence left by
      // best-effort patch application while local edits were in flight
      // (those states never repair; see below) when no further store
      // event arrives to trigger the on-change repair.
      after: {
        [QUIESCENT_REPAIR_DELAY]: {
          actions: ['apply sync'],
        },
      },
      on: {
        'patch emitted': {
          target: 'local write',
        },
        // Mutation events arrive in bursts (one per input batch), so a
        // flush can land after a sibling flush already advanced the state.
        'mutation flushed': {
          target: 'pushing to remote',
          actions: ['push to remote'],
        },
        'remote value changed': {
          actions: ['apply sync'],
        },
        // No immediate repair here: every remote patch batch also updates
        // the store value, so the accompanying 'remote value changed'
        // event runs the whole-value repair right after.
        'remote patches received': {
          actions: ['apply remote patches'],
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
        'remote patches received': {
          target: 'pending sync',
          actions: ['apply remote patches'],
        },
      },
    },
    'pushing to remote': {
      on: {
        'patch emitted': {
          target: 'local write',
        },
        'mutation flushed': {
          actions: ['push to remote'],
        },
        // No repair on the push acknowledgment: the editor snapshot can
        // lag the live document while the user keeps typing, so a diff
        // against the store here resurrects deleted text and duplicates
        // in-flight keystrokes. Once truly idle, the store change or the
        // quiescent delay runs the repair with a caught-up snapshot.
        'remote value changed': {
          target: 'idle',
        },
        'remote patches received': {
          actions: ['apply remote patches'],
        },
      },
    },
    'pending sync': {
      on: {
        'patch emitted': {},
        'mutation flushed': {
          target: 'pushing to remote',
          actions: ['push to remote'],
        },
        'remote value changed': {},
        'remote patches received': {
          actions: ['apply remote patches'],
        },
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
              const mergeable = toMergeableMarkDefsPatches(
                event.patches,
                context.getRemoteValue,
                () => context.editor.getSnapshot().context.value,
              )
              debug.push('pushing patches %o', mergeable)
              pushPatches(mergeable)
              return
            } catch {
              // fall back to pushing the whole value below
            }
          }

          if (debug.push.enabled) {
            debug.push(
              'pushing whole value %s',
              debugTextOf(
                event.value ?? context.editor.getSnapshot().context.value,
              ),
            )
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
        pushPatches,
      },
    },
  )

  return null
}
