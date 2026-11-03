import type {
  DiffMatchPatch,
  InsertPatch,
  Patch,
  SetIfMissingPatch,
  SetPatch,
  UnsetPatch,
} from '@portabletext/patches'
import {isSpan, type PortableTextBlock} from '@portabletext/schema'
import {
  cleanupEfficiency,
  DIFF_DELETE,
  DIFF_EQUAL,
  DIFF_INSERT,
  applyPatches as diffMatchPatchApplyPatches,
  makeDiff,
  parsePatch,
} from '@sanity/diff-match-patch'
import type {EditorContext} from '../editor/editor-snapshot'
import type {Node} from '../engine/interfaces/node'
import type {Path, PathSegment} from '../engine/interfaces/path'
import {hasUsableKey} from '../paths/node-segment'
import {getNode} from '../traversal/get-node'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {isRecord} from '../utils/asserters'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {applyDeselect} from './apply-selection'
import {isEqualValues} from './equality'
import {getValue} from './get-value'
import {isEqualToEmptyEditor} from './values'

/**
 * Creates a function that can apply a patch onto a PortableTextEditorEngine.
 */
export function createApplyPatch(
  context: Pick<EditorContext, 'schema' | 'keyGenerator'> & {
    initialValue: Array<PortableTextBlock> | undefined
  },
): (editor: PortableTextEditorEngine, patch: Patch) => boolean {
  return (editor: PortableTextEditorEngine, patch: Patch): boolean => {
    let changed = false

    try {
      switch (patch.type) {
        case 'insert':
          changed = insertPatch(context, editor, patch)
          break
        case 'unset':
          changed = unsetPatch(editor, patch)
          break
        case 'set':
          changed = setPatch(editor, patch)
          break
        case 'setIfMissing':
          changed = setPatch(editor, patch)
          break
        case 'diffMatchPatch':
          changed = diffMatchPatch(editor, patch)
          break
      }
    } catch (err) {
      console.error(err)
    }

    return changed
  }
}

function diffMatchPatch(
  editor: Pick<
    PortableTextEditorEngine,
    'apply' | 'onChange' | 'containers' | 'snapshot'
  >,
  patch: DiffMatchPatch,
): boolean {
  const lastSegment = patch.path.at(-1)
  if (lastSegment !== 'text') {
    // Diffing tools also emit `diffMatchPatch` for strings outside span
    // text, e.g. `span.marks[0]` when a decorator is swapped. Resolve the
    // current string, apply the diff, and set the result.
    const currentValue = getValue(editor.snapshot.context.value, patch.path)
    if (typeof currentValue !== 'string') {
      return false
    }

    const [newValue] = diffMatchPatchApplyPatches(
      parsePatch(patch.value),
      currentValue,
      {allowExceedingIndices: true},
    )

    editor.apply({
      type: 'set',
      path: patch.path,
      value: newValue,
    })

    return true
  }

  const spanPath = patch.path.slice(0, -1)
  const spanEntry = getNode(editor.snapshot, spanPath)

  if (
    !spanEntry ||
    !isSpan({schema: editor.snapshot.context.schema}, spanEntry.node)
  ) {
    return false
  }

  const patches = parsePatch(patch.value)
  const [newValue] = diffMatchPatchApplyPatches(patches, spanEntry.node.text, {
    allowExceedingIndices: true,
  })
  const diff = cleanupEfficiency(makeDiff(spanEntry.node.text, newValue), 5)

  let offset = 0
  for (const [op, text] of diff) {
    if (op === DIFF_INSERT) {
      editor.apply({
        type: 'insert.text',
        path: spanEntry.path,
        offset,
        text,
      })
      offset += text.length
    } else if (op === DIFF_DELETE) {
      editor.apply({
        type: 'remove.text',
        path: spanEntry.path,
        offset,
        text,
      })
    } else if (op === DIFF_EQUAL) {
      offset += text.length
    }
  }

  return true
}

function insertPatch(
  context: Pick<EditorContext, 'schema' | 'keyGenerator'> & {
    initialValue: Array<PortableTextBlock> | undefined
  },
  editor: PortableTextEditorEngine,
  patch: InsertPatch,
) {
  const {items, position} = patch

  const target = resolveInsertTarget(
    editor.snapshot.context.value,
    patch.path,
    position,
  )

  if (!target) {
    return false
  }

  const editorWasEmptyBefore =
    patch.path.length === 1 &&
    isEqualToEmptyEditor(
      context.initialValue,
      editor.snapshot.context.value,
      context.schema,
    ) &&
    (editor.valueUnsetEmitted ||
      // Mirrors `editorWasEmpty` in `subscriber.patch-generation.ts`: once
      // this editor's stream has unset the field, a value-equal recording
      // is not proof of persistence.
      !isEqualValues(
        {schema: context.schema},
        editor.lastSyncedValue,
        editor.snapshot.context.value,
      ))

  for (let index = 0; index < items.length; index++) {
    const itemIndex = target.index + index

    // Addressing the destination itself (`before`) dirties the inserted
    // node for normalization. Only an append anchors on the item before
    // it, since a sidecar array goes through `@portabletext/patches`,
    // where an index equal to the length addresses nothing.
    editor.apply(
      itemIndex < target.length + index
        ? {
            type: 'insert',
            path: [...target.arrayPath, itemIndex],
            node: items[index] as Node,
            position: 'before',
          }
        : {
            type: 'insert',
            path: [...target.arrayPath, itemIndex - 1],
            node: items[index] as Node,
            position: 'after',
          },
    )
  }

  if (target.replaces) {
    editor.apply({
      type: 'unset',
      path: [...target.arrayPath, target.index + items.length],
    })
  }

  if (
    editorWasEmptyBefore &&
    !target.replaces &&
    typeof patch.path[0] === 'number'
  ) {
    const removeIdx = position === 'before' ? items.length : 0
    const removeNode = editor.snapshot.context.value[removeIdx]
    if (removeNode) {
      editor.apply({
        type: 'unset',
        path: [{_key: removeNode._key}],
      })
    }
  }

  return true
}

/**
 * Resolve where an `insert` patch places its items, against the value
 * before any of them goes in.
 *
 * Keep in sync with `applyPatchToArray`, `findTargetIndex` and `insert` in
 * `@portabletext/patches` (`array.ts`, `arrayInsert.ts`): a negative index
 * counts from the end, an index outside the array or a missing key, field
 * or value addresses nothing, and an empty array takes `[0]` and `[-1]`.
 *
 * `arrayPath` keeps an ancestor's key where a keyed lookup reaches the
 * resolved node, and the resolved index otherwise. `applyAll` and the
 * engine's keyed lookups all scan for the first item with the key and read
 * `_key` on every item before it, as `findTargetIndex` does.
 */
function resolveInsertTarget(
  value: Array<PortableTextBlock>,
  path: Path,
  position: InsertPatch['position'],
):
  | {
      arrayPath: Path
      index: number
      length: number
      replaces: boolean
    }
  | undefined {
  const selector = path.at(-1)
  const arrayPath: Path = []
  let current: unknown = value

  for (const segment of path.slice(0, -1)) {
    if (Array.isArray(current)) {
      const index = findTargetIndex(current, segment)
      if (index === undefined) {
        return undefined
      }
      const element: unknown = current[index]
      const key = isRecord(element) ? element['_key'] : undefined
      // A later sibling sharing the key, or a node after a `null` item that
      // the scan throws on, keeps its index.
      arrayPath.push(
        hasUsableKey(key) && findTargetIndex(current, {_key: key}) === index
          ? {_key: key}
          : index,
      )
      current = element
      continue
    }

    if (
      !isRecord(current) ||
      typeof segment !== 'string' ||
      !(segment in current)
    ) {
      return undefined
    }

    arrayPath.push(segment)
    current = current[segment]
  }

  if (!Array.isArray(current)) {
    return undefined
  }

  if (current.length === 0) {
    return selector === 0 || selector === -1
      ? {arrayPath, index: 0, length: 0, replaces: false}
      : undefined
  }

  const targetIndex = findTargetIndex(current, selector)

  if (targetIndex === undefined) {
    return undefined
  }

  // Mirrors `insert` in `arrayInsert.ts` step by step, then the start
  // truncation of `Array.prototype.splice`. The modulo is not redundant
  // for a fractional selector: `len + index` can round up to the next
  // integer (`3 + 0.9999999999999999 === 4`).
  const len = current.length
  const idx = Math.abs((len + targetIndex) % len) % len

  return {
    arrayPath,
    index: Math.trunc(position === 'after' ? idx + 1 : idx),
    length: len,
    replaces: position === 'replace',
  }
}

function findTargetIndex(
  array: Array<unknown>,
  segment: PathSegment | undefined,
): number | undefined {
  if (typeof segment === 'number') {
    const index = segment < 0 ? array.length + segment : segment
    return index >= 0 && index < array.length ? index : undefined
  }

  if (isKeyedSegment(segment)) {
    // `array.ts` reads `item._key` on every item up to the match, so a
    // `null` item before it throws there and applies nothing.
    for (let index = 0; index < array.length; index++) {
      const item = array[index]
      if (item === null || item === undefined) {
        return undefined
      }
      if ((item as Record<string, unknown>)['_key'] === segment._key) {
        return index
      }
    }
    return undefined
  }

  return undefined
}

function setPatch(
  editor: PortableTextEditorEngine,
  patch: SetPatch | SetIfMissingPatch,
) {
  // For setIfMissing, check if the value at the target path already exists.
  if (patch.type === 'setIfMissing') {
    if (
      patch.path.length === 0
        ? editor.snapshot.context.value.length > 0
        : getValue(editor.snapshot.context.value, patch.path) !== undefined
    ) {
      return false
    }
  }

  editor.apply({
    type: 'set',
    path: patch.path,
    value: patch.value,
  })

  return true
}

function unsetPatch(editor: PortableTextEditorEngine, patch: UnsetPatch) {
  if (patch.path.length === 0) {
    applyDeselect(editor)
  }

  editor.apply({type: 'unset', path: patch.path})

  return true
}
