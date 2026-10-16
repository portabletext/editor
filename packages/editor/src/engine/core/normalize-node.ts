import type {
  PortableTextObject,
  PortableTextTextBlock,
} from '@portabletext/schema'
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
import {
  repairContainerField,
  repairDuplicateKey,
  repairEmptyTextBlockChildren,
  repairInlineObjectBracketing,
  repairMissingKey,
  repairMissingTextBlockChildren,
  repairMissingType,
  repairSpanText,
  type RepairContext,
} from '../../repair'
import {resolveContainerByPath} from '../../schema/resolve-container-by-path'
import {getChildren} from '../../traversal/get-children'
import {getParent} from '../../traversal/get-parent'
import {getPathSubSchema} from '../../traversal/get-path-sub-schema'
import {getTextBlock} from '../../traversal/get-text-block'
import {isObject} from '../../traversal/is-object'
import {isEditor} from '../editor/is-editor'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import {isSpanNode} from '../node/is-span-node'
import {isTextBlockNode} from '../node/is-text-block-node'
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
  const nodeRecord = node as Record<string, unknown>

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

  const repairContext: RepairContext = {
    schema: editor.snapshot.context.schema,
    keyGenerator: editor.snapshot.context.keyGenerator,
    verifiedUniqueGroups: editor.verifiedUniqueChildGroups,
  }
  const parent = getParent(editor.snapshot, path)

  const missingTypeFix = repairMissingType({node, path, parent}, repairContext)
  if (missingTypeFix) {
    debug.normalization(
      missingTypeFix.value === editor.snapshot.context.schema.span.name
        ? 'Setting span type on node without a type'
        : 'Setting block type on node without a type',
    )
    editor.apply(missingTypeFix)
    return
  }

  const missingKeyFix = repairMissingKey({node, path, parent}, repairContext)
  if (missingKeyFix) {
    debug.normalization('Setting missing key on node')
    editor.apply(missingKeyFix)
    return
  }

  if (path.length > 0 && nodeRecord['_key'] !== undefined) {
    // The child array holding this node is the field segment right after
    // the parent's path. Read it straight off the parent node rather than
    // re-resolving children from the root through the schema; fall back to
    // `getChildren` only if that field isn't a plain array.
    const childFieldName = parent
      ? (path[parent.path.length] as string)
      : undefined
    const rawSiblings =
      parent && typeof childFieldName === 'string'
        ? (parent.node as Record<string, unknown>)[childFieldName]
        : undefined
    const siblings: ReadonlyArray<{_key?: string}> = !parent
      ? editor.snapshot.context.value
      : Array.isArray(rawSiblings)
        ? (rawSiblings as ReadonlyArray<{_key?: string}>)
        : getChildren(editor.snapshot, parent.path).map((entry) => entry.node)

    const duplicateKeyFix = repairDuplicateKey(
      {node, path, parent, siblings},
      repairContext,
    )
    if (duplicateKeyFix) {
      // Nodes sharing a key share one dirty path, so a third copy of this
      // key is never visited as itself. Queue this node again, below the
      // renamed one, so the next visit renames the next copy and the checks
      // after this return still run for this node.
      updateDirtyPaths(editor, [path])
      debug.normalization('Fixing duplicate key on node')
      editor.apply(duplicateKeyFix)
      return
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

  const spanTextFix = repairSpanText({node, path, parent}, repairContext)
  if (spanTextFix) {
    debug.normalization('Adding .text to span node')
    editor.apply(spanTextFix)
    return
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

  if (isSpanNode({schema: editor.snapshot.context.schema}, node)) {
    return
  }

  if (isObject(editor.snapshot, node)) {
    const resolved = resolveContainerByPath(
      {
        containers: editor.containers,
        schema: editor.snapshot.context.schema,
        value: editor.snapshot.context.value,
      },
      path,
      node,
    )
    const field =
      resolved && 'container' in resolved ? resolved.field : undefined
    const containerFieldFix = repairContainerField(
      {node, path, parent},
      field
        ? {
            field,
            placeholderStyle: () =>
              resolvePlaceholderStyle(editor.snapshot, [
                ...path,
                field.name,
                0,
              ]),
          }
        : undefined,
      repairContext,
    )
    if (containerFieldFix) {
      editor.apply(containerFieldFix)
    }
    return
  }

  // Text blocks must always have at least one child span.
  if (isTextBlockNode({schema: editor.snapshot.context.schema}, node)) {
    const missingChildrenFix = repairMissingTextBlockChildren(
      {node, path, parent},
      repairContext,
    )
    if (missingChildrenFix) {
      editor.apply(missingChildrenFix)
      return
    }

    const emptyChildrenFix = repairEmptyTextBlockChildren(
      {node, path, parent},
      repairContext,
    )
    // We will have to refetch the element any time we modify its children
    // since it clones to a new immutable reference when we do.
    let element = node as unknown as PortableTextTextBlock

    if (emptyChildrenFix) {
      editor.apply(emptyChildrenFix)
      const refetched = getTextBlock(editor.snapshot, path)?.node
      if (!refetched) {
        return
      }
      element = refetched
    }

    // Since we'll be applying operations while iterating, we also modify
    // `n` when adding/removing nodes.
    for (let n = 0; n < element.children.length; n++) {
      const child = element.children[n]!

      const prev: Node | undefined = element.children[n - 1]
      const childPath = [...path, 'children', {_key: child._key}]

      if (isSpan({schema: editor.snapshot.context.schema}, child)) {
        if (
          prev != null &&
          isSpan({schema: editor.snapshot.context.schema}, prev) &&
          // Only this merge/empty-drop arm defers; the inline-object
          // bracketing below is a repair and keeps running.
          !hasRemoteFrame(editor.applyContext)
        ) {
          // Merge adjacent text nodes that are empty or match.
          if (child.text === '') {
            editor.apply({type: 'unset', path: childPath})
            const refetched = getTextBlock(editor.snapshot, path)?.node
            if (!refetched) {
              return
            }
            element = refetched
            n--
          } else if (prev.text === '') {
            const prevPath = [...path, 'children', {_key: prev._key}]
            editor.apply({type: 'unset', path: prevPath})
            const refetched = getTextBlock(editor.snapshot, path)?.node
            if (!refetched) {
              return
            }
            element = refetched
            n--
          } else if (textEquals(child, prev, {loose: true})) {
            applyMergeNode(editor, childPath, prev.text.length)
            const refetched = getTextBlock(editor.snapshot, path)?.node
            if (!refetched) {
              return
            }
            element = refetched
            n--
          }
        }
      } else if (isObject(editor.snapshot, child)) {
        let bracketingFix = repairInlineObjectBracketing(
          {children: element.children, path},
          n,
          repairContext,
        )
        while (bracketingFix) {
          editor.apply(bracketingFix)
          const refetched = getTextBlock(editor.snapshot, path)?.node
          if (!refetched) {
            return
          }
          element = refetched
          n++
          bracketingFix = repairInlineObjectBracketing(
            {children: element.children, path},
            n,
            repairContext,
          )
        }
      }
    }

    return
  }
}
