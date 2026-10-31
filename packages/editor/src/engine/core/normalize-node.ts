import {
  getStructuralCorrection,
  type StructuralContext,
  type StructuralCorrection,
} from '@portabletext/repair'
import {
  getAdjacentSpansCorrection,
  getCanonicalCorrection,
  type CanonicalCorrection,
} from '../../canonical-correction'
import {getCaretCorrection, type CaretCorrection} from '../../caret-correction'
import {withoutPatching} from '../../engine-plugins/engine-plugin.without-patching'
import {applyInsertNodeAtPath} from '../../internal-utils/apply-insert-node'
import {applyMergeNode} from '../../internal-utils/apply-merge-node'
import {
  createPlaceholderBlock,
  resolvePlaceholderStyle,
} from '../../internal-utils/create-placeholder-block'
import {debug} from '../../internal-utils/debug'
import {serializePath} from '../../paths/serialize-path'
import {resolveContainerByPath} from '../../schema/resolve-container-by-path'
import {getChildren} from '../../traversal/get-children'
import {getParent} from '../../traversal/get-parent'
import {getPathSubSchema} from '../../traversal/get-path-sub-schema'
import {getTextBlock} from '../../traversal/get-text-block'
import {isObject} from '../../traversal/is-object'
import {isEditor} from '../editor/is-editor'
import type {Editor} from '../interfaces/editor'
import type {Path} from '../interfaces/path'
import {isAncestorPath} from '../path/is-ancestor-path'
import type {WithEditorFirstArg} from '../utils/types'
import {hasRemoteFrame} from './apply-context'
import {getSetInverse} from './get-set-inverse'
import {updateDirtyPaths} from './update-dirty-paths'

export const normalizeNode: WithEditorFirstArg<Editor['normalizeNode']> = (
  editor,
  entry,
) => {
  const [node, path] = entry

  /**
   * Add a placeholder block when the editor is empty
   */
  if (isEditor(node) && node.snapshot.context.value.length === 0) {
    withoutPatching(editor, () => {
      applyInsertNodeAtPath(
        editor,
        createPlaceholderBlock(editor.snapshot),
        [0],
      )
    })
    return
  }

  const structuralContext: StructuralContext = {
    schema: editor.snapshot.context.schema,
    keyGenerator: editor.snapshot.context.keyGenerator,
  }
  const parent = getParent(editor.snapshot, path)

  const structural = getStructuralCorrection(structuralContext, {
    node,
    path,
    parent,
    siblings: () => getSiblings(editor, path, parent),
  })

  if (structural) {
    if (structural.patches.some((patch) => !isAncestorPath(path, patch.path))) {
      // A fix outside this node's subtree does not dirty this node, so
      // nothing would visit it again. Queue it below the fix's dirty paths so
      // the rest of the repairs still run for it. For a duplicate key fix
      // this also renames the next copy, since nodes sharing a key share one
      // dirty path and a third copy is never visited as itself.
      updateDirtyPaths(editor, [path])
    }
    debug.normalization(
      structuralMessage(structural, editor.snapshot.context.schema.span.name),
    )
    applyStructuralCorrection(editor, structural)
    return
  }

  const fix =
    getCaretCorrection(structuralContext, {
      node,
      path,
      parent,
      container: () => {
        if (!isObject(editor.snapshot, node)) {
          return undefined
        }
        const resolved = resolveContainerByPath(
          {
            containers: editor.containers,
            schema: editor.snapshot.context.schema,
            value: editor.snapshot.context.value,
          },
          path,
          node,
        )
        if (!resolved || !('container' in resolved)) {
          return undefined
        }
        const field = resolved.field
        return {
          field,
          placeholderStyle: () =>
            resolvePlaceholderStyle(editor.snapshot, [...path, field.name, 0]),
        }
      },
    }) ??
    (hasRemoteFrame(editor.applyContext)
      ? undefined
      : getCanonicalCorrection(structuralContext, {
          node,
          path,
          parent,
          defaultStyle: () =>
            getPathSubSchema(editor.snapshot, path).styles.at(0)?.name,
        }))

  if (fix) {
    if (!isAncestorPath(path, fix.path)) {
      // Same as for structural fixes above.
      updateDirtyPaths(editor, [path])
    }
    if (fix.rule === 'adjacent-spans') {
      // Clear every adjacent pair in this one visit. A run of empty spans
      // can take more corrections than the normalization iteration budget
      // allows if each one costs a visit.
      let next: CanonicalCorrection | undefined = fix
      while (next) {
        applyCorrection(editor, next)
        const block = getTextBlock(editor.snapshot, path)
        if (!block) {
          return
        }
        next = getAdjacentSpansCorrection(structuralContext, {
          node: block.node,
          path,
          parent,
        })
      }
      return
    }
    debug.normalization(correctionMessage(fix))
    applyCorrection(editor, fix)
    return
  }
}

function applyStructuralCorrection(
  editor: Editor,
  correction: StructuralCorrection,
): void {
  for (const patch of correction.patches) {
    if (patch.type !== 'set') {
      throw new Error(
        `Unsupported ${patch.type} patch in ${correction.type} correction`,
      )
    }
    // Build the inverse here rather than leaving it to `apply`, which skips
    // inverses for remote changes, so a correction behaves the same whichever
    // change triggered it.
    editor.apply({
      type: 'set',
      path: patch.path,
      value: patch.value,
      inverse: getSetInverse(editor, patch.path, patch.value),
    })
  }
}

function applyCorrection(
  editor: Editor,
  correction: CaretCorrection | CanonicalCorrection,
): void {
  if (correction.type === 'merge') {
    applyMergeNode(editor, correction.path, correction.position)
    return
  }
  const {rule, ...operation} = correction
  if (operation.type !== 'set') {
    editor.apply(operation)
    return
  }
  // Corrections carry no inverse. Build it here rather than leaving it to
  // `apply`, which skips inverses for remote changes, so a correction
  // behaves the same whichever change triggered it.
  editor.apply({
    ...operation,
    inverse: getSetInverse(editor, operation.path, operation.value),
  })
}

/**
 * The child array holding the node, or `undefined` when it is already
 * verified to hold unique keys. The verdict survives edits elsewhere in the
 * tree: the op stream drops it only when the group's own membership changes
 * (see `invalidateVerifiedGroups`). Caching it keeps a bulk insert of n
 * pre-keyed siblings at O(n) instead of O(n^2).
 */
function getSiblings(
  editor: Editor,
  path: Path,
  parent: {node: unknown; path: Path} | undefined,
): ReadonlyArray<{_key?: string}> | undefined {
  const siblings = readSiblings(editor, path, parent)

  // A group of zero or one child can't hold a duplicate key, so it needs
  // neither a scan nor a cache entry. This is the common shape for
  // container fields (a row's single cell, a cell's single content block)
  // and single-span text blocks, so only groups with two or more children
  // ever cost a serialized id.
  if (siblings.length <= 1) {
    return siblings
  }

  const childFieldName = parent ? path[parent.path.length] : undefined
  const groupId = serializePath(
    parent && typeof childFieldName === 'string'
      ? [...parent.path, childFieldName]
      : [],
  )

  if (editor.verifiedUniqueChildGroups.has(groupId)) {
    return undefined
  }

  const seenKeys = new Set<string>()
  for (const sibling of siblings) {
    if (sibling._key === undefined) {
      continue
    }
    if (seenKeys.has(sibling._key)) {
      return siblings
    }
    seenKeys.add(sibling._key)
  }

  editor.verifiedUniqueChildGroups.add(groupId)
  return siblings
}

function readSiblings(
  editor: Editor,
  path: Path,
  parent: {node: unknown; path: Path} | undefined,
): ReadonlyArray<{_key?: string}> {
  if (!parent) {
    return editor.snapshot.context.value
  }

  // The child array holding this node is the field segment right after the
  // parent's path. Read it straight off the parent node rather than
  // re-resolving children from the root through the schema; fall back to
  // `getChildren` only if that field isn't a plain array.
  const childFieldName = path[parent.path.length]
  const rawSiblings =
    typeof childFieldName === 'string'
      ? (parent.node as Record<string, unknown>)[childFieldName]
      : undefined

  if (Array.isArray(rawSiblings)) {
    return rawSiblings as ReadonlyArray<{_key?: string}>
  }

  return getChildren(editor.snapshot, parent.path).map((entry) => entry.node)
}

function structuralMessage(
  correction: StructuralCorrection,
  spanTypeName: string,
): string {
  switch (correction.type) {
    case 'missing-type':
      return correction.patches.some(
        (patch) => patch.type === 'set' && patch.value === spanTypeName,
      )
        ? 'Setting span type on node without a type'
        : 'Setting block type on node without a type'
    case 'missing-key':
      return 'Setting missing key on node'
    case 'duplicate-key':
      return 'Fixing duplicate key on node'
    case 'span-text':
      return 'Adding .text to span node'
    case 'missing-children':
      return 'Adding .children to text block node'
  }
}

function correctionMessage(fix: CaretCorrection | CanonicalCorrection): string {
  switch (fix.rule) {
    case 'container-field':
      return 'Adding missing child array field to container node'
    case 'empty-children':
      return 'Adding a span to text block node without children'
    case 'inline-object-bracketing':
      return 'Adding a span next to inline object'
    case 'merge-spans-same-marks':
      return 'merging spans with same marks'
    case 'missing-mark-definitions':
      return 'adding .markDefs to block node'
    case 'missing-style':
      return 'adding .style to block node'
    case 'missing-marks':
      return 'Adding .marks to span node'
    case 'empty-span-annotations':
      return 'removing annotations from empty span node'
    case 'duplicate-mark-definitions':
      return 'removing duplicate markDefs'
    case 'unused-mark-definitions':
      return 'removing markDef not in use'
    case 'adjacent-spans':
      return ''
  }
}
