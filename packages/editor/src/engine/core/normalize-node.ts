import type {
  PortableTextObject,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import {withoutPatching} from '../../engine-plugins/engine-plugin.without-patching'
import {applyInsertNodeAtPath} from '../../internal-utils/apply-insert-node'
import {applyMergeNode} from '../../internal-utils/apply-merge-node'
import {createPlaceholderBlock} from '../../internal-utils/create-placeholder-block'
import {debug} from '../../internal-utils/debug'
import {isEqualMarkDefs} from '../../internal-utils/equality'
import {setNodeProperties} from '../../internal-utils/set-node-properties'
import {getChildFieldName} from '../../paths/get-child-field-name'
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
import type {Path} from '../interfaces/path'
import {createSpanNode} from '../node/create-span-node'
import {isSpanNode} from '../node/is-span-node'
import {isTextBlockNode} from '../node/is-text-block-node'
import {parentPath} from '../path/parent-path'
import {textEquals} from '../text/text-equals'
import type {WithEditorFirstArg} from '../utils/types'

/**
 * Parent nodes whose direct children have been verified to carry no
 * duplicate `_key`s. A node is an immutable reference: any structural
 * change to its children mints a fresh parent reference, which is simply
 * absent from the map, so the verdict can never go stale. A `WeakMap`
 * lets collected nodes drop their entries.
 *
 * The root sibling group has no parent node (its container is the editor,
 * whose reference never changes), so its verdict can't be tracked by
 * reference. It lives in `editor.rootKeysVerifiedUnique` and is
 * invalidated explicitly by the op stream whenever a root-level
 * membership change occurs (see `subscribeUpdateValue`).
 */
const verifiedUniqueSiblingGroups = new WeakMap<object, true>()

function siblingGroupIsVerifiedUnique(
  editor: Editor,
  parent: {node: Node} | undefined,
): boolean {
  return parent
    ? verifiedUniqueSiblingGroups.has(parent.node)
    : editor.rootKeysVerifiedUnique
}

function markSiblingGroupVerified(
  editor: Editor,
  parent: {node: Node} | undefined,
): void {
  if (parent) {
    verifiedUniqueSiblingGroups.set(parent.node, true)
  } else {
    editor.rootKeysVerifiedUnique = true
  }
}

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
  if (isTextBlock({schema: editor.snapshot.context.schema}, node)) {
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

  // Normalize missing _type based on context.
  if (nodeRecord['_type'] === undefined && path.length > 0) {
    const parent = getNode(editor.snapshot, parentPath(path))

    // Children of text blocks default to the span type.
    if (
      parent &&
      isTextBlock({schema: editor.snapshot.context.schema}, parent.node)
    ) {
      debug.normalization('Setting span type on node without a type')
      editor.apply({
        type: 'set',
        path: [...path, '_type'],
        value: editor.snapshot.context.schema.span.name,
        inverse: {type: 'unset', path: [...path, '_type']},
      })
      return
    }

    // Everything else defaults to the text block type.
    debug.normalization('Setting block type on node without a type')
    editor.apply({
      type: 'set',
      path: [...path, '_type'],
      value: editor.snapshot.context.schema.block.name,
      inverse: {type: 'unset', path: [...path, '_type']},
    })
    return
  }

  // Set missing _key on any non-editor node.
  // Uses numeric index in the path because the node has no _key to
  // address it by. Any ancestor segments with undefined _key are also
  // resolved to numeric indices.
  if (nodeRecord['_key'] === undefined && path.length > 0) {
    const newKey = editor.snapshot.context.keyGenerator()
    debug.normalization('Setting missing key on node')

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

    editor.apply({
      type: 'set',
      path: [...numericPath, '_key'],
      value: newKey,
      inverse: {type: 'unset', path: [...numericPath, '_key']},
    })
    return
  }

  // Fix duplicate _key among siblings
  if (path.length > 0 && nodeRecord['_key'] !== undefined) {
    const parent = getParent(editor.snapshot, path)
    // Verifying a sibling group has no duplicate keys is O(siblings); doing
    // it per node is O(siblings^2) across the group. Skip the scan when the
    // group was already verified unique (and not invalidated since). Without
    // this, a bulk insert of n pre-keyed root blocks rescans the whole root
    // group n times.
    if (!siblingGroupIsVerifiedUnique(editor, parent)) {
      const key = nodeRecord['_key'] as string
      // The child array holding this node is the field segment right after
      // the parent's path, so read it straight off the parent node instead
      // of re-resolving children from the root through the schema. Fall
      // back to `getChildren` only if that field isn't a plain array.
      const childFieldName = parent ? path[parent.path.length] : undefined
      const rawSiblings =
        parent && typeof childFieldName === 'string'
          ? (parent.node as Record<string, unknown>)[childFieldName]
          : undefined
      const siblingNodes: ReadonlyArray<{_key?: string}> = !parent
        ? editor.snapshot.context.value
        : Array.isArray(rawSiblings)
          ? (rawSiblings as ReadonlyArray<{_key?: string}>)
          : getChildren(editor.snapshot, parent.path).map((entry) => entry.node)

      let groupIsUnique = true
      let duplicateIndexOfKey = -1

      // A group of zero or one child can't hold a duplicate key, so skip
      // the set-building scan. This is the common shape for container
      // fields (a row's single cell, a cell's single content block).
      if (siblingNodes.length > 1) {
        const seenKeys = new Set<string>()
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
      }

      if (duplicateIndexOfKey !== -1) {
        const newKey = editor.snapshot.context.keyGenerator()
        debug.normalization('Fixing duplicate key on node')
        const numericPath: Path = parent
          ? [
              ...parent.path,
              getChildFieldName(editor.snapshot.context, parent.path) ??
                'children',
              duplicateIndexOfKey,
            ]
          : [duplicateIndexOfKey]
        editor.apply({
          type: 'set',
          path: [...numericPath, '_key'],
          value: newKey,
          inverse: {
            type: 'set',
            path: [...numericPath, '_key'],
            value: key,
          },
        })
        return
      }

      if (groupIsUnique) {
        markSiblingGroupVerified(editor, parent)
      }
    }
  }

  /**
   * Add missing .markDefs to text block nodes
   */
  if (
    isTextBlockNode({schema: editor.snapshot.context.schema}, node) &&
    !Array.isArray(node.markDefs)
  ) {
    debug.normalization('adding .markDefs to block node')
    setNodeProperties(editor, {markDefs: []}, path)
    return
  }

  /**
   * Add missing .style to text block nodes
   */
  if (
    isTextBlockNode({schema: editor.snapshot.context.schema}, node) &&
    typeof node.style === 'undefined'
  ) {
    const defaultStyle = getPathSubSchema(editor.snapshot, path).styles.at(
      0,
    )?.name
    if (defaultStyle) {
      debug.normalization('adding .style to block node')
      setNodeProperties(editor, {style: defaultStyle}, path)
      return
    }
  }

  /**
   * Add missing .text to span nodes
   */
  if (
    isSpanNode(editor.snapshot.context, node) &&
    typeof node.text !== 'string'
  ) {
    debug.normalization('Adding .text to span node')
    editor.apply({
      type: 'set',
      path: [...path, 'text'],
      value: '',
      inverse: {type: 'unset', path: [...path, 'text']},
    })
    return
  }

  /**
   * Add missing .marks to span nodes
   */
  if (
    isSpan({schema: editor.snapshot.context.schema}, node) &&
    !Array.isArray(node.marks)
  ) {
    debug.normalization('Adding .marks to span node')
    setNodeProperties(editor, {marks: []}, path)
    return
  }

  /**
   * Remove annotations from empty spans
   */
  if (isSpan({schema: editor.snapshot.context.schema}, node)) {
    const blockPath = parentPath(path)
    const blockEntry = getTextBlock(editor.snapshot, blockPath)
    if (!blockEntry) {
      return
    }
    const decorators = getPathSubSchema(editor.snapshot, path).decorators.map(
      (decorator) => decorator.name,
    )
    const annotations = node.marks?.filter((mark) => !decorators.includes(mark))

    if (node.text === '' && annotations && annotations.length > 0) {
      debug.normalization('removing annotations from empty span node')
      setNodeProperties(
        editor,
        {marks: node.marks?.filter((mark) => decorators.includes(mark))},
        path,
      )
      return
    }
  }

  /**
   * Remove orphaned annotations from child spans of block nodes
   */
  if (isTextBlock({schema: editor.snapshot.context.schema}, node)) {
    const decorators = getPathSubSchema(editor.snapshot, path).decorators.map(
      (decorator) => decorator.name,
    )

    for (const {node: child, path: childPath} of getChildren(
      editor.snapshot,
      path,
    )) {
      if (isSpan({schema: editor.snapshot.context.schema}, child)) {
        const marks = child.marks ?? []
        const orphanedAnnotations = marks.filter((mark) => {
          return (
            !decorators.includes(mark) &&
            !node.markDefs?.find((def) => def._key === mark)
          )
        })

        if (orphanedAnnotations.length > 0) {
          debug.normalization('removing orphaned annotations from span node')
          setNodeProperties(
            editor,
            {
              marks: marks.filter(
                (mark) => !orphanedAnnotations.includes(mark),
              ),
            },
            childPath,
          )
          return
        }
      }
    }
  }

  /**
   * Remove orphaned annotations from span nodes
   */
  if (isSpan({schema: editor.snapshot.context.schema}, node)) {
    const blockPath = parentPath(path)
    const blockEntry2 = getTextBlock(editor.snapshot, blockPath)

    if (blockEntry2) {
      const block = blockEntry2.node
      const decorators = getPathSubSchema(editor.snapshot, path).decorators.map(
        (decorator) => decorator.name,
      )
      const marks = node.marks ?? []
      const orphanedAnnotations = marks.filter((mark) => {
        return (
          !decorators.includes(mark) &&
          !block.markDefs?.find((def) => def._key === mark)
        )
      })

      if (orphanedAnnotations.length > 0) {
        debug.normalization('removing orphaned annotations from span node')
        setNodeProperties(
          editor,
          {
            marks: marks.filter((mark) => !orphanedAnnotations.includes(mark)),
          },
          path,
        )
        return
      }
    }
  }

  /**
   * Remove duplicate markDefs
   */
  if (isTextBlock({schema: editor.snapshot.context.schema}, node)) {
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
      setNodeProperties(editor, {markDefs: newMarkDefs}, path)
      return
    }
  }

  /**
   * Remove markDefs not in use
   */
  if (isTextBlock({schema: editor.snapshot.context.schema}, node)) {
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
      setNodeProperties(editor, {markDefs: newMarkDefs}, path)
      return
    }
  }

  if (isSpanNode({schema: editor.snapshot.context.schema}, node)) {
    /**
     * Add missing .text to span nodes
     */
    if (typeof node.text !== 'string') {
      debug.normalization('Adding .text to span node')
      editor.apply({
        type: 'set',
        path: [...path, 'text'],
        value: '',
        inverse: {type: 'unset', path: [...path, 'text']},
      })
      return
    }

    return
  }

  // Container normalization: ensure the child array field exists and is
  // non-empty.
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
    const arrayField =
      resolved && 'container' in resolved ? resolved.field : undefined

    if (arrayField) {
      const fieldValue = (node as Record<string, unknown>)[arrayField.name]
      const needsField = !Array.isArray(fieldValue)
      const needsChild = needsField || fieldValue.length === 0

      if (needsChild) {
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
          setNodeProperties(editor, {[arrayField.name]: [childNode]}, path)
          return
        }

        if (needsField) {
          setNodeProperties(editor, {[arrayField.name]: []}, path)
          return
        }

        if (childNode) {
          editor.apply({
            type: 'insert',
            path: [...path, arrayField.name, 0],
            node: childNode,
            position: 'before',
          })
          return
        }
      }
    }
  }

  // Fix duplicate _key among children of container/object nodes.
  // The sibling-level handler above catches duplicates when each child is
  // visited individually, but container children may not be visited if
  // containers gates traversal. Handle it at the parent level as well.
  if (isObject(editor.snapshot, node)) {
    const children = [...getChildren(editor.snapshot, path)]

    if (children.length > 1) {
      const seen = new Map<string, number>()

      for (let i = 0; i < children.length; i++) {
        const key = children[i]!.node._key
        if (key !== undefined && seen.has(key)) {
          const newKey = editor.snapshot.context.keyGenerator()
          debug.normalization('Fixing duplicate key on container child')
          // Use numeric index to address the duplicate since keyed path
          // is ambiguous for nodes with the same key.
          const arrayFieldName = getChildFieldName(
            editor.snapshot.context,
            path,
          )
          if (arrayFieldName) {
            editor.apply({
              type: 'set',
              path: [...path, arrayFieldName, i, '_key'],
              value: newKey,
              inverse: {
                type: 'set',
                path: [...path, arrayFieldName, i, '_key'],
                value: key,
              },
            })
            return
          }
        }
        if (key !== undefined) {
          seen.set(key, i)
        }
      }
    }

    return
  }

  // Text blocks must always have at least one child span.
  if (isTextBlockNode({schema: editor.snapshot.context.schema}, node)) {
    // We will have to refetch the element any time we modify its children
    // since it clones to a new immutable reference when we do.
    let element = node as unknown as PortableTextTextBlock

    // Runtime data can arrive without children (e.g. after an unset patch).
    if (!Array.isArray(element.children)) {
      editor.apply({
        type: 'set',
        path: [...path, 'children'],
        value: [],
        inverse: {type: 'unset', path: [...path, 'children']},
      })
      return
    }

    // Ensure that text blocks have at least one child.
    if (element.children.length === 0) {
      const child = createSpanNode(editor.snapshot.context)
      editor.apply({
        type: 'insert',
        path: [...path, 'children', 0],
        node: child,
        position: 'before',
      })
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
          isSpan({schema: editor.snapshot.context.schema}, prev)
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
        if (
          prev == null ||
          !isSpan({schema: editor.snapshot.context.schema}, prev)
        ) {
          const newChild = createSpanNode(editor.snapshot.context)
          editor.apply({
            type: 'insert',
            path: childPath,
            node: newChild,
            position: 'before',
          })
          const refetched = getTextBlock(editor.snapshot, path)?.node
          if (!refetched) {
            return
          }
          element = refetched
          n++
        }
        if (n === element.children.length - 1) {
          const newChild = createSpanNode(editor.snapshot.context)
          editor.apply({
            type: 'insert',
            path: [...path, 'children', {_key: element.children[n]!._key}],
            node: newChild,
            position: 'after',
          })
          const refetched = getTextBlock(editor.snapshot, path)?.node
          if (!refetched) {
            return
          }
          element = refetched
          n++
        }
      }
    }

    return
  }
}
