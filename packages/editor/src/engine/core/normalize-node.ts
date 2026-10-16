import type {PortableTextObject} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import {withoutPatching} from '../../engine-plugins/engine-plugin.without-patching'
import {applyInsertNodeAtPath} from '../../internal-utils/apply-insert-node'
import {applyMergeNode} from '../../internal-utils/apply-merge-node'
import {applyNodeProperties} from '../../internal-utils/apply-node-properties'
import {
  createPlaceholderBlock,
  resolvePlaceholderStyle,
} from '../../internal-utils/create-placeholder-block'
import {debug} from '../../internal-utils/debug'
import {isEqualMarkDefs} from '../../internal-utils/equality'
import {repairNode, type RepairContext, type RepairFix} from '../../repair'
import {resolveContainerByPath} from '../../schema/resolve-container-by-path'
import {getChildren} from '../../traversal/get-children'
import {getParent} from '../../traversal/get-parent'
import {getPathSubSchema} from '../../traversal/get-path-sub-schema'
import {getTextBlock} from '../../traversal/get-text-block'
import {isObject} from '../../traversal/is-object'
import {isEditor} from '../editor/is-editor'
import type {Editor} from '../interfaces/editor'
import type {Path} from '../interfaces/path'
import {isTextBlockNode} from '../node/is-text-block-node'
import {isAncestorPath} from '../path/is-ancestor-path'
import {parentPath} from '../path/parent-path'
import {textEquals} from '../text/text-equals'
import type {WithEditorFirstArg} from '../utils/types'
import {hasRemoteFrame} from './apply-context'
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

  const repairContext: RepairContext = {
    schema: editor.snapshot.context.schema,
    keyGenerator: editor.snapshot.context.keyGenerator,
    verifiedUniqueGroups: editor.verifiedUniqueChildGroups,
  }
  const parent = getParent(editor.snapshot, path)

  const fix = repairNode(
    {
      node,
      path,
      parent,
      siblings: () => getSiblings(editor, path, parent),
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
    },
    repairContext,
  )

  if (fix) {
    if (!isAncestorPath(path, fix.path)) {
      // A fix outside this node's subtree does not dirty this node, so
      // nothing would visit it again. Queue it below the fix's dirty paths so
      // the rest of the repairs still run for it. For a duplicate key fix
      // this also renames the next copy, since nodes sharing a key share one
      // dirty path and a third copy is never visited as itself.
      updateDirtyPaths(editor, [path])
    }
    const {rule, ...operation} = fix
    debug.normalization(
      repairMessage(fix, editor.snapshot.context.schema.span.name),
    )
    editor.apply(operation)
    return
  }

  /**
   * Merge spans with same set of .marks
   */
  if (
    !hasRemoteFrame(editor.applyContext) &&
    isTextBlock({schema: editor.snapshot.context.schema}, node)
  ) {
    const children = getChildren(editor.snapshot, path)

    for (let i = 0; i < children.length - 1; i++) {
      const {node: child} = children[i]!
      const {node: nextNode, path: nextChildPath} = children[i + 1]!

      if (
        isSpan({schema: editor.snapshot.context.schema}, child) &&
        isSpan({schema: editor.snapshot.context.schema}, nextNode) &&
        child.marks?.every((mark) => nextNode.marks?.includes(mark)) &&
        nextNode.marks?.every((mark) => child.marks?.includes(mark))
      ) {
        debug.normalization('merging spans with same marks')
        applyMergeNode(editor, nextChildPath, child.text.length)
        return
      }
    }
  }

  /**
   * Add missing .markDefs to text block nodes
   */
  if (
    !hasRemoteFrame(editor.applyContext) &&
    isTextBlockNode({schema: editor.snapshot.context.schema}, node) &&
    !Array.isArray(node.markDefs)
  ) {
    debug.normalization('adding .markDefs to block node')
    applyNodeProperties(editor, {markDefs: []}, path)
    return
  }

  /**
   * Add missing .style to text block nodes
   */
  if (
    !hasRemoteFrame(editor.applyContext) &&
    isTextBlockNode({schema: editor.snapshot.context.schema}, node) &&
    typeof node.style === 'undefined'
  ) {
    const defaultStyle = getPathSubSchema(editor.snapshot, path).styles.at(
      0,
    )?.name
    if (defaultStyle) {
      debug.normalization('adding .style to block node')
      applyNodeProperties(editor, {style: defaultStyle}, path)
      return
    }
  }

  /**
   * Add missing .marks to span nodes
   */
  if (
    !hasRemoteFrame(editor.applyContext) &&
    isSpan({schema: editor.snapshot.context.schema}, node) &&
    !Array.isArray(node.marks)
  ) {
    debug.normalization('Adding .marks to span node')
    applyNodeProperties(editor, {marks: []}, path)
    return
  }

  /**
   * Remove annotations from empty spans
   */
  if (
    !hasRemoteFrame(editor.applyContext) &&
    isSpan({schema: editor.snapshot.context.schema}, node)
  ) {
    const blockPath = parentPath(path)
    const blockEntry = getTextBlock(editor.snapshot, blockPath)
    if (!blockEntry) {
      return
    }
    // Only treat a mark as an annotation if it points to one of the
    // block's `markDefs`. A mark that doesn't resolve might be a decorator
    // from another schema (one that was removed here, or one a collaborator
    // has that we don't), so it is left alone.
    const annotations = node.marks?.filter((mark) =>
      blockEntry.node.markDefs?.some((markDef) => markDef._key === mark),
    )

    if (node.text === '' && annotations && annotations.length > 0) {
      debug.normalization('removing annotations from empty span node')
      applyNodeProperties(
        editor,
        {marks: node.marks?.filter((mark) => !annotations.includes(mark))},
        path,
      )
      return
    }
  }

  /**
   * Remove duplicate markDefs
   */
  if (
    !hasRemoteFrame(editor.applyContext) &&
    isTextBlock({schema: editor.snapshot.context.schema}, node)
  ) {
    const markDefs = node.markDefs ?? []
    const markDefKeys = new Set<string>()
    const newMarkDefs: Array<PortableTextObject> = []

    for (const markDef of markDefs) {
      if (!markDefKeys.has(markDef._key)) {
        markDefKeys.add(markDef._key)
        newMarkDefs.push(markDef)
      }
    }

    if (markDefs.length !== newMarkDefs.length) {
      debug.normalization('removing duplicate markDefs')
      applyNodeProperties(editor, {markDefs: newMarkDefs}, path)
      return
    }
  }

  /**
   * Remove markDefs not in use
   */
  if (
    !hasRemoteFrame(editor.applyContext) &&
    isTextBlock({schema: editor.snapshot.context.schema}, node)
  ) {
    const newMarkDefs = (node.markDefs || []).filter((def) => {
      return node.children.find((child) => {
        return (
          isSpan({schema: editor.snapshot.context.schema}, child) &&
          Array.isArray(child.marks) &&
          child.marks.includes(def._key)
        )
      })
    })

    if (node.markDefs && !isEqualMarkDefs(newMarkDefs, node.markDefs)) {
      debug.normalization('removing markDef not in use')
      applyNodeProperties(editor, {markDefs: newMarkDefs}, path)
      return
    }
  }

  if (
    !hasRemoteFrame(editor.applyContext) &&
    isTextBlock({schema: editor.snapshot.context.schema}, node)
  ) {
    // We will have to refetch the element any time we modify its children
    // since it clones to a new immutable reference when we do.
    let element = node

    // Since we'll be applying operations while iterating, we also modify
    // `n` when removing nodes.
    for (let n = 1; n < element.children.length; n++) {
      const child = element.children[n]!
      const prev = element.children[n - 1]!

      if (
        !isSpan({schema: editor.snapshot.context.schema}, child) ||
        !isSpan({schema: editor.snapshot.context.schema}, prev)
      ) {
        continue
      }

      const childPath = [...path, 'children', {_key: child._key}]

      // Merge adjacent text nodes that are empty or match.
      if (child.text === '') {
        editor.apply({type: 'unset', path: childPath})
      } else if (prev.text === '') {
        const prevPath = [...path, 'children', {_key: prev._key}]
        editor.apply({type: 'unset', path: prevPath})
      } else if (textEquals(child, prev, {loose: true})) {
        applyMergeNode(editor, childPath, prev.text.length)
      } else {
        continue
      }

      const refetched = getTextBlock(editor.snapshot, path)?.node
      if (!refetched) {
        return
      }
      element = refetched
      n--
    }
  }
}

function getSiblings(
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

function repairMessage(fix: RepairFix, spanTypeName: string): string {
  switch (fix.rule) {
    case 'missing-type':
      return fix.type === 'set' && fix.value === spanTypeName
        ? 'Setting span type on node without a type'
        : 'Setting block type on node without a type'
    case 'missing-key':
      return 'Setting missing key on node'
    case 'duplicate-key':
      return 'Fixing duplicate key on node'
    case 'span-text':
      return 'Adding .text to span node'
    case 'container-field':
      return 'Adding missing child array field to container node'
    case 'missing-children':
      return 'Adding .children to text block node'
    case 'empty-children':
      return 'Adding a span to text block node without children'
    case 'inline-object-bracketing':
      return 'Adding a span next to inline object'
  }
}
