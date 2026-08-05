import type {PortableTextObject} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import {createPlaceholderBlock} from '../../internal-utils/create-placeholder-block'
import {isEqualMarkDefs} from '../../internal-utils/equality'
import {getChildFieldName} from '../../paths/get-child-field-name'
import {serializePath} from '../../paths/serialize-path'
import {resolveContainerByPath} from '../../schema/resolve-container-by-path'
import {getChildren} from '../../traversal/get-children'
import {getNode} from '../../traversal/get-node'
import {getParent} from '../../traversal/get-parent'
import {getPathSubSchema} from '../../traversal/get-path-sub-schema'
import {getTextBlock} from '../../traversal/get-text-block'
import {isObject} from '../../traversal/is-object'
import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import {isEditor} from '../editor/is-editor'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import type {EngineOperation} from '../interfaces/operation'
import type {Path} from '../interfaces/path'
import {createSpanNode} from '../node/create-span-node'
import {isSpanNode} from '../node/is-span-node'
import {isTextBlockNode} from '../node/is-text-block-node'
import {parentPath} from '../path/parent-path'

/**
 * The node a correction inspects, and the tools it needs to describe a
 * repair. `node` is `Editor` only for the root (`path` empty) case; every
 * other correction sees a plain content `Node`.
 */
export type CorrectionContext = {
  editor: Editor
  node: Editor | Node
  path: Path
}

/**
 * A repair that is pure given `CorrectionContext`: given the node at `path`,
 * decide whether it is defective and, if so, describe the fix as a list of
 * operations, without mutating anything the fix doesn't return. The one
 * exception is `duplicateSiblingKey`, which writes `verifiedUniqueChildGroups`
 * directly instead of returning it as an operation (see the inline
 * justification on that write).
 *
 * `undefined` means "not my defect" - the executor tries the next
 * correction. A non-empty array is the fix; the executor applies each
 * operation in order and lets the fixed-point normalize loop re-enter, so a
 * correction never needs to predict the tree shape its own fix produces.
 */
export type Correction = {
  name: string
  /**
   * `structural` corrections repair invalid data shapes (a node the schema
   * or engine cannot render at all) and always run. `cosmetic` corrections
   * fill in optional defaults and are skipped while
   * `editor.isProcessingRemoteChanges`, so adopting remote content doesn't
   * fight the collaborator who is mid-edit on the same node.
   */
  type: 'structural' | 'cosmetic'
  /**
   * Applies the fix without emitting patches for it. Used only by
   * `root.no-blocks`: the placeholder block is a local presentation detail,
   * not a change the document's collaborators should see.
   */
  suppressPatches?: boolean
  /**
   * Identifies the sibling group this correction just verified, so the
   * executor can skip re-invoking `correct` for the same group next time
   * (see `verifiedUniqueChildGroups` on `Editor`). Returns `undefined` when
   * the check is cheap enough that memoizing it isn't worth a cache entry.
   */
  memoKey?: (context: CorrectionContext) => string | undefined
  correct: (context: CorrectionContext) => Array<EngineOperation> | undefined
}

function defineCorrection(correction: Correction): Correction {
  return correction
}

/**
 * Build the `set`/`unset` operation for a single property change, or
 * `undefined` if `value` already matches what's on the node. Mirrors the
 * single-property case of `setNodeProperties` (every correction here only
 * ever changes one property at a time), returning the operation instead of
 * applying it.
 */
function setPropertyOp(
  node: Editor | Node,
  path: Path,
  key: string,
  value: unknown,
): EngineOperation | undefined {
  const nodeRecord = node as Record<string, unknown>

  // Unreachable at every current call site: each one passes either a
  // freshly built array or a value already known to differ from what's on
  // the node. Kept as a defensive no-op guard, mirroring `setNodeProperties`.
  if (value === nodeRecord[key]) {
    return undefined
  }

  if (value != null) {
    const hadProperty = Object.prototype.hasOwnProperty.call(nodeRecord, key)
    return {
      type: 'set',
      path: [...path, key],
      value,
      inverse: hadProperty
        ? {type: 'set', path: [...path, key], value: nodeRecord[key]}
        : {type: 'unset', path: [...path, key]},
    }
  }

  if (Object.prototype.hasOwnProperty.call(nodeRecord, key)) {
    return {
      type: 'unset',
      path: [...path, key],
      inverse: {type: 'set', path: [...path, key], value: nodeRecord[key]},
    }
  }

  return undefined
}

export const rootNoBlocks = defineCorrection({
  name: 'root.no-blocks',
  type: 'structural',
  suppressPatches: true,
  correct: ({node}) => {
    if (!isEditor(node) || node.snapshot.context.value.length !== 0) {
      return undefined
    }

    const placeholder = createPlaceholderBlock(node.snapshot)
    const spanKey = (placeholder.children[0] as {_key: string})._key
    const point = {
      path: [{_key: placeholder._key}, 'children', {_key: spanKey}],
      offset: 0,
    }

    return [
      {type: 'insert', path: [0], node: placeholder, position: 'before'},
      {
        // Unconditional `properties: null` mirrors `applySelect`'s
        // no-current-selection branch. This correction only runs once the
        // value is empty, and whatever selection endpoint pointed into the
        // now-gone last block was already nulled by the removal (see the
        // transform-selection branch in `apply-operation.ts`), so there is
        // never a prior selection to diff against here.
        type: 'set.selection',
        properties: null,
        newProperties: {anchor: point, focus: point},
      },
    ]
  },
})

const missingType = defineCorrection({
  name: 'node.missing-type',
  type: 'structural',
  correct: ({editor, node, path}) => {
    const nodeRecord = node as Record<string, unknown>
    if (nodeRecord['_type'] !== undefined || path.length === 0) {
      return undefined
    }

    const parent = getNode(editor.snapshot, parentPath(path))

    // Children of text blocks default to the span type.
    if (
      parent &&
      isTextBlock({schema: editor.snapshot.context.schema}, parent.node)
    ) {
      return [
        {
          type: 'set',
          path: [...path, '_type'],
          value: editor.snapshot.context.schema.span.name,
          inverse: {type: 'unset', path: [...path, '_type']},
        },
      ]
    }

    // Everything else defaults to the text block type.
    return [
      {
        type: 'set',
        path: [...path, '_type'],
        value: editor.snapshot.context.schema.block.name,
        inverse: {type: 'unset', path: [...path, '_type']},
      },
    ]
  },
})

const missingKey = defineCorrection({
  name: 'node.missing-key',
  type: 'structural',
  correct: ({editor, node, path}) => {
    const nodeRecord = node as Record<string, unknown>
    if (nodeRecord['_key'] !== undefined || path.length === 0) {
      return undefined
    }

    const newKey = editor.snapshot.context.keyGenerator()

    // Build a fully resolved path by walking the tree from the root,
    // replacing any undefined keyed segments with numeric indices.
    const numericPath: Path = []
    let currentNode: Node | undefined

    for (const segment of path) {
      if (typeof segment === 'string') {
        // Field name: descend into the field
        if (currentNode) {
          numericPath.push(segment)
        }
        continue
      }

      // Determine the siblings array at this level
      const siblings: ArrayLike<Node> = currentNode
        ? (((currentNode as Record<string, unknown>)[
            numericPath[numericPath.length - 1] as string
          ] as ArrayLike<Node>) ?? [])
        : editor.snapshot.context.value

      if (isKeyedSegment(segment) && segment._key !== undefined) {
        numericPath.push(segment)
        currentNode = Array.prototype.find.call(
          siblings,
          (child: Node) => child._key === segment._key,
        )
      } else {
        // Undefined _key or numeric: resolve to numeric index
        let index = typeof segment === 'number' ? segment : -1
        if (index === -1) {
          for (let i = 0; i < siblings.length; i++) {
            if ((siblings[i] as Node)._key === undefined) {
              index = i
              break
            }
          }
        }
        if (index !== -1) {
          numericPath.push(index)
          currentNode = siblings[index] as Node
        }
      }
    }

    return [
      {
        type: 'set',
        path: [...numericPath, '_key'],
        value: newKey,
        inverse: {type: 'unset', path: [...numericPath, '_key']},
      },
    ]
  },
})

type SiblingGroup = {
  groupId: string
  siblingNodes: ReadonlyArray<{_key?: string}>
  parentNodePath: Path | undefined
  childFieldName: string | undefined
  key: string
}

/**
 * Resolve the sibling group a node belongs to, or `undefined` when the
 * group can't hold a duplicate (missing key, root node, or a group of zero
 * or one child - the common shape for container fields and single-span
 * text blocks). Shared by `duplicateSiblingKey`'s `correct` and `memoKey` so
 * both agree on exactly which groups are cacheable.
 */
function resolveSiblingGroup(
  context: CorrectionContext,
): SiblingGroup | undefined {
  const {editor, node, path} = context
  const nodeRecord = node as Record<string, unknown>

  if (path.length === 0 || nodeRecord['_key'] === undefined) {
    return undefined
  }

  const parent = getParent(editor.snapshot, path)
  const key = nodeRecord['_key'] as string
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
  const siblingNodes: ReadonlyArray<{_key?: string}> = !parent
    ? editor.snapshot.context.value
    : Array.isArray(rawSiblings)
      ? (rawSiblings as ReadonlyArray<{_key?: string}>)
      : getChildren(editor.snapshot, parent.path).map((entry) => entry.node)

  if (siblingNodes.length <= 1) {
    return undefined
  }

  // Identify the group by its serialized path (the root group is `''`).
  const groupId =
    parent && typeof childFieldName === 'string'
      ? serializePath([...parent.path, childFieldName])
      : ''

  return {
    groupId,
    siblingNodes,
    parentNodePath: parent?.path,
    childFieldName,
    key,
  }
}

const duplicateSiblingKey = defineCorrection({
  name: 'node.duplicate-sibling-key',
  type: 'structural',
  memoKey: (context) => resolveSiblingGroup(context)?.groupId,
  correct: (context) => {
    const group = resolveSiblingGroup(context)
    if (!group) {
      return undefined
    }

    const {editor} = context
    const {groupId, siblingNodes, parentNodePath, childFieldName, key} = group

    const seenKeys = new Set<string>()
    let groupIsUnique = true
    let duplicateIndexOfKey = -1

    for (let index = 0; index < siblingNodes.length; index++) {
      const siblingKey = siblingNodes[index]?._key
      if (siblingKey === undefined) {
        continue
      }
      if (seenKeys.has(siblingKey)) {
        groupIsUnique = false
        // The second occurrence of this node's own key is the one the
        // previous per-node implementation renamed; preserve that so
        // generated keys land on the same node.
        if (siblingKey === key && duplicateIndexOfKey === -1) {
          duplicateIndexOfKey = index
        }
      } else {
        seenKeys.add(siblingKey)
      }
    }

    if (duplicateIndexOfKey !== -1) {
      const newKey = editor.snapshot.context.keyGenerator()
      const numericPath: Path =
        parentNodePath && typeof childFieldName === 'string'
          ? [...parentNodePath, childFieldName, duplicateIndexOfKey]
          : [duplicateIndexOfKey]
      return [
        {
          type: 'set',
          path: [...numericPath, '_key'],
          value: newKey,
          inverse: {
            type: 'set',
            path: [...numericPath, '_key'],
            value: key,
          },
        },
      ]
    }

    // Verifying a group is O(siblings); caching the verdict keeps a bulk
    // insert of n pre-keyed siblings at O(n) instead of O(n^2). Written
    // here (not by the executor off a bare `undefined` return) because
    // only the full scan above knows the group is actually unique: a node
    // whose own key isn't part of any duplicate also returns `undefined`
    // while `groupIsUnique` is false, and caching that would hide a real
    // duplicate elsewhere in the group from later visits.
    if (groupIsUnique) {
      editor.verifiedUniqueChildGroups.add(groupId)
    }

    return undefined
  },
})

const missingMarkDefs = defineCorrection({
  name: 'text-block.missing-mark-defs',
  type: 'cosmetic',
  correct: ({editor, node, path}) => {
    if (
      !isTextBlockNode({schema: editor.snapshot.context.schema}, node) ||
      Array.isArray(node.markDefs)
    ) {
      return undefined
    }

    const op = setPropertyOp(node, path, 'markDefs', [])
    return op ? [op] : undefined
  },
})

const missingStyle = defineCorrection({
  name: 'text-block.missing-style',
  type: 'cosmetic',
  correct: ({editor, node, path}) => {
    if (
      !isTextBlockNode({schema: editor.snapshot.context.schema}, node) ||
      typeof node.style !== 'undefined'
    ) {
      return undefined
    }

    const defaultStyle = getPathSubSchema(editor.snapshot, path).styles.at(
      0,
    )?.name
    if (!defaultStyle) {
      return undefined
    }

    const op = setPropertyOp(node, path, 'style', defaultStyle)
    return op ? [op] : undefined
  },
})

const spanMissingText = defineCorrection({
  name: 'span.missing-text',
  type: 'structural',
  correct: ({editor, node, path}) => {
    if (
      !isSpanNode(editor.snapshot.context, node) ||
      typeof node.text === 'string'
    ) {
      return undefined
    }

    return [
      {
        type: 'set',
        path: [...path, 'text'],
        value: '',
        inverse: {type: 'unset', path: [...path, 'text']},
      },
    ]
  },
})

const spanMissingMarks = defineCorrection({
  name: 'span.missing-marks',
  type: 'cosmetic',
  correct: ({editor, node, path}) => {
    if (
      !isSpan({schema: editor.snapshot.context.schema}, node) ||
      Array.isArray(node.marks)
    ) {
      return undefined
    }

    const op = setPropertyOp(node, path, 'marks', [])
    return op ? [op] : undefined
  },
})

const spanEmptyWithAnnotations = defineCorrection({
  name: 'span.empty-with-annotations',
  type: 'cosmetic',
  correct: ({editor, node, path}) => {
    if (!isSpan({schema: editor.snapshot.context.schema}, node)) {
      return undefined
    }

    const blockPath = parentPath(path)
    const blockEntry = getTextBlock(editor.snapshot, blockPath)
    if (!blockEntry) {
      return undefined
    }

    // Only treat a mark as an annotation if it points to one of the
    // block's `markDefs`. A mark that doesn't resolve might be a decorator
    // from another schema (one that was removed here, or one a collaborator
    // has that we don't), so it is left alone.
    const annotations = node.marks?.filter((mark) =>
      blockEntry.node.markDefs?.some((markDef) => markDef._key === mark),
    )

    if (node.text !== '' || !annotations || annotations.length === 0) {
      return undefined
    }

    const op = setPropertyOp(
      node,
      path,
      'marks',
      node.marks?.filter((mark) => !annotations.includes(mark)),
    )
    return op ? [op] : undefined
  },
})

const duplicateMarkDefs = defineCorrection({
  name: 'text-block.duplicate-mark-defs',
  type: 'cosmetic',
  correct: ({editor, node, path}) => {
    if (!isTextBlock({schema: editor.snapshot.context.schema}, node)) {
      return undefined
    }

    const markDefs = node.markDefs ?? []
    const markDefKeys = new Set<string>()
    const newMarkDefs: Array<PortableTextObject> = []

    for (const markDef of markDefs) {
      if (!markDefKeys.has(markDef._key)) {
        markDefKeys.add(markDef._key)
        newMarkDefs.push(markDef)
      }
    }

    if (markDefs.length === newMarkDefs.length) {
      return undefined
    }

    const op = setPropertyOp(node, path, 'markDefs', newMarkDefs)
    return op ? [op] : undefined
  },
})

const unusedMarkDefs = defineCorrection({
  name: 'text-block.unused-mark-defs',
  type: 'cosmetic',
  correct: ({editor, node, path}) => {
    if (!isTextBlock({schema: editor.snapshot.context.schema}, node)) {
      return undefined
    }

    const newMarkDefs = (node.markDefs || []).filter((def) => {
      return node.children.find((child) => {
        return (
          isSpan({schema: editor.snapshot.context.schema}, child) &&
          Array.isArray(child.marks) &&
          child.marks.includes(def._key)
        )
      })
    })

    if (!node.markDefs || isEqualMarkDefs(newMarkDefs, node.markDefs)) {
      return undefined
    }

    const op = setPropertyOp(node, path, 'markDefs', newMarkDefs)
    return op ? [op] : undefined
  },
})

const containerMissingChildArray = defineCorrection({
  name: 'container.missing-child-array',
  type: 'structural',
  correct: ({editor, node, path}) => {
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
    const arrayField =
      resolved && 'container' in resolved ? resolved.field : undefined

    if (!arrayField) {
      return undefined
    }

    const fieldValue = (node as Record<string, unknown>)[arrayField.name]
    const needsField = !Array.isArray(fieldValue)
    const needsChild = needsField || fieldValue.length === 0

    if (!needsChild) {
      return undefined
    }

    const acceptsBlocks = arrayField.of.some(
      (definition) => definition.type === 'block',
    )
    const firstChildType = arrayField.of.at(0)

    let childNode: Node | undefined
    if (acceptsBlocks) {
      childNode = createPlaceholderBlock(editor.snapshot, [
        ...path,
        arrayField.name,
        0,
      ])
    } else if (firstChildType && firstChildType.type !== 'block') {
      // For inline declarations (`type: 'object'`), the actual type
      // identity is in `name`. For bare references (any other `type`),
      // the type itself is the identity.
      const childTypeName =
        firstChildType.type === 'object' && 'name' in firstChildType
          ? firstChildType.name
          : firstChildType.type
      childNode = {
        _type: childTypeName,
        _key: editor.snapshot.context.keyGenerator(),
      } as Node
    }

    if (needsField && childNode) {
      // Set the field with its initial child in a single operation
      // instead of two (set empty array + insert child).
      const op = setPropertyOp(node, path, arrayField.name, [childNode])
      return op ? [op] : undefined
    }

    if (needsField) {
      const op = setPropertyOp(node, path, arrayField.name, [])
      return op ? [op] : undefined
    }

    if (childNode) {
      return [
        {
          type: 'insert',
          path: [...path, arrayField.name, 0],
          node: childNode,
          position: 'before',
        },
      ]
    }

    return undefined
  },
})

const containerDuplicateChildKey = defineCorrection({
  name: 'container.duplicate-child-key',
  type: 'structural',
  correct: ({editor, node, path}) => {
    // The sibling-level correction above catches duplicates when each
    // child is visited individually, but container children may not be
    // visited if containers gates traversal. Handle it at the parent
    // level as well.
    if (!isObject(editor.snapshot, node)) {
      return undefined
    }

    const children = [...getChildren(editor.snapshot, path)]

    if (children.length <= 1) {
      return undefined
    }

    const seen = new Map<string, number>()

    for (let i = 0; i < children.length; i++) {
      const key = children[i]!.node._key
      if (key !== undefined && seen.has(key)) {
        const newKey = editor.snapshot.context.keyGenerator()
        // Use numeric index to address the duplicate since keyed path
        // is ambiguous for nodes with the same key.
        const arrayFieldName = getChildFieldName(editor.snapshot.context, path)
        if (arrayFieldName) {
          return [
            {
              type: 'set',
              path: [...path, arrayFieldName, i, '_key'],
              value: newKey,
              inverse: {
                type: 'set',
                path: [...path, arrayFieldName, i, '_key'],
                value: key,
              },
            },
          ]
        }
      }
      if (key !== undefined) {
        seen.set(key, i)
      }
    }

    return undefined
  },
})

const textBlockChildrenNotArray = defineCorrection({
  name: 'text-block.children-not-array',
  type: 'structural',
  correct: ({editor, node, path}) => {
    if (
      !isTextBlockNode({schema: editor.snapshot.context.schema}, node) ||
      Array.isArray(node.children)
    ) {
      return undefined
    }

    // Runtime data can arrive without children (e.g. after an unset patch).
    return [
      {
        type: 'set',
        path: [...path, 'children'],
        value: [],
        inverse: {type: 'unset', path: [...path, 'children']},
      },
    ]
  },
})

const textBlockNoChildren = defineCorrection({
  name: 'text-block.no-children',
  type: 'structural',
  correct: ({editor, node, path}) => {
    if (
      !isTextBlockNode({schema: editor.snapshot.context.schema}, node) ||
      !Array.isArray(node.children) ||
      node.children.length !== 0
    ) {
      return undefined
    }

    // Only the span insert is returned here; the rest of what the old
    // per-child loop did for a freshly-seeded block (merges, bracketing)
    // falls out of the fixed-point re-entry that follows this insert.
    const child = createSpanNode(editor.snapshot.context)
    return [
      {
        type: 'insert',
        path: [...path, 'children', 0],
        node: child,
        position: 'before',
      },
    ]
  },
})

/**
 * All node-shape repairs `normalizeNode` runs, in the order the executor
 * tries them. Two repairs stay imperative in `normalize-node.ts` instead of
 * appearing here: the same-marks span merge, because it needs
 * `applyMergeNode`, which isn't expressible as a plain `EngineOperation`
 * list yet; and the late per-child merge/bracket loop, because it mutates
 * and refetches the block node mid-loop, which the fixed-point re-entry
 * model doesn't support - only that loop's merge/drop arm shares the
 * `applyMergeNode` dependency (see the keep-in-sync comments there).
 *
 * `rootNoBlocks` is also exported on its own: the executor runs it before
 * the imperative merge step, and takes the rest of the loop order from
 * `CORRECTIONS.slice(1)`.
 */
export const CORRECTIONS: ReadonlyArray<Correction> = [
  rootNoBlocks,
  missingType,
  missingKey,
  duplicateSiblingKey,
  missingMarkDefs,
  missingStyle,
  spanMissingText,
  spanMissingMarks,
  spanEmptyWithAnnotations,
  duplicateMarkDefs,
  unusedMarkDefs,
  containerMissingChildArray,
  containerDuplicateChildKey,
  textBlockChildrenNotArray,
  textBlockNoChildren,
]
