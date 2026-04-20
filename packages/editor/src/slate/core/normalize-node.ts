import type {
  PortableTextObject,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import {applyInsertNodeAtPath} from '../../internal-utils/apply-insert-node'
import {applyMergeNode} from '../../internal-utils/apply-merge-node'
import {createPlaceholderBlock} from '../../internal-utils/create-placeholder-block'
import {debug} from '../../internal-utils/debug'
import {isEqualMarkDefs} from '../../internal-utils/equality'
import {setNodeProperties} from '../../internal-utils/set-node-properties'
import {getChildren} from '../../node-traversal/get-children'
import {getNode} from '../../node-traversal/get-node'
import {getParent} from '../../node-traversal/get-parent'
import {getTextBlockNode} from '../../node-traversal/get-text-block-node'
import {getChildFieldName} from '../../paths/get-child-field-name'
import {getContainerScopedName} from '../../schema/get-container-scoped-name'
import type {ChildArrayField, Containers} from '../../schema/resolve-containers'
import {withoutPatching} from '../../slate-plugins/slate-plugin.without-patching'
import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import {isEditor} from '../editor/is-editor'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {createSpanNode} from '../node/create-span-node'
import {isObjectNode} from '../node/is-object-node'
import {isSpanNode} from '../node/is-span-node'
import {isTextBlockNode} from '../node/is-text-block-node'
import {parentPath} from '../path/parent-path'
import {textEquals} from '../text/text-equals'
import type {WithEditorFirstArg} from '../utils/types'

export const normalizeNode: WithEditorFirstArg<Editor['normalizeNode']> = (
  editor,
  entry,
) => {
  const [node, path] = entry
  const nodeRecord = node as Record<string, unknown>

  /**
   * Add a placeholder block when the editor is empty
   */
  if (isEditor(node) && node.children.length === 0) {
    withoutPatching(editor, () => {
      applyInsertNodeAtPath(editor, createPlaceholderBlock(editor), [0])
    })
    return
  }

  /**
   * Merge spans with same set of .marks
   */
  if (isTextBlock({schema: editor.schema}, node)) {
    const children = getChildren(editor, path)

    for (let i = 0; i < children.length - 1; i++) {
      const {node: child} = children[i]!
      const {node: nextNode, path: nextChildPath} = children[i + 1]!

      if (
        isSpan({schema: editor.schema}, child) &&
        isSpan({schema: editor.schema}, nextNode) &&
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
    const parent = getNode(editor, parentPath(path))

    // Children of text blocks default to the span type.
    if (parent && isTextBlock({schema: editor.schema}, parent.node)) {
      debug.normalization('Setting span type on node without a type')
      editor.apply({
        type: 'set',
        path: [...path, '_type'],
        value: editor.schema.span.name,
        inverse: {type: 'unset', path: [...path, '_type']},
      })
      return
    }

    // Everything else defaults to the text block type.
    debug.normalization('Setting block type on node without a type')
    editor.apply({
      type: 'set',
      path: [...path, '_type'],
      value: editor.schema.block.name,
      inverse: {type: 'unset', path: [...path, '_type']},
    })
    return
  }

  // Set missing _key on any non-editor node.
  // Uses numeric index in the path because the node has no _key to
  // address it by. Any ancestor segments with undefined _key are also
  // resolved to numeric indices.
  if (nodeRecord['_key'] === undefined && path.length > 0) {
    const newKey = editor.keyGenerator()
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
        : editor.children

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
    const parent = getParent(editor, path)
    const siblings = parent
      ? getChildren(editor, parent.path)
      : editor.children.map((child, index) => ({
          node: child,
          path: [{_key: child._key}],
          index,
        }))

    const siblingList = [...siblings]
    const key = nodeRecord['_key'] as string

    // Find all siblings with this key
    let firstIndex = -1
    for (let i = 0; i < siblingList.length; i++) {
      if (siblingList[i]!.node._key === key) {
        if (firstIndex === -1) {
          firstIndex = i
        } else {
          // Found a duplicate: rename the later occurrence
          const newKey = editor.keyGenerator()
          debug.normalization('Fixing duplicate key on node')
          const dupParentPath = parent ? parent.path : []
          const numericPath: Path =
            dupParentPath.length === 0
              ? [i]
              : [
                  ...dupParentPath,
                  getChildFieldName(editor, parent!.path) ?? 'children',
                  i,
                ]
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
      }
    }
  }

  /**
   * Add missing .markDefs to text block nodes
   */
  if (
    isTextBlockNode({schema: editor.schema}, node) &&
    !Array.isArray(node.markDefs)
  ) {
    debug.normalization('adding .markDefs to block node')
    setNodeProperties(editor, {markDefs: []}, path)
    return
  }

  /**
   * Add missing .style to text block nodes
   */
  {
    const defaultStyle = editor.schema.styles.at(0)?.name
    if (
      defaultStyle &&
      isTextBlockNode({schema: editor.schema}, node) &&
      typeof node.style === 'undefined'
    ) {
      debug.normalization('adding .style to block node')
      setNodeProperties(editor, {style: defaultStyle}, path)
      return
    }
  }

  /**
   * Add missing .text to span nodes
   */
  if (isSpanNode(editor, node) && typeof node.text !== 'string') {
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
  if (isSpan({schema: editor.schema}, node) && !Array.isArray(node.marks)) {
    debug.normalization('Adding .marks to span node')
    setNodeProperties(editor, {marks: []}, path)
    return
  }

  /**
   * Remove annotations from empty spans
   */
  if (isSpan({schema: editor.schema}, node)) {
    const blockPath = parentPath(path)
    const blockEntry = getTextBlockNode(editor, blockPath)
    if (!blockEntry) {
      return
    }
    const decorators = editor.schema.decorators.map(
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
  if (isTextBlock({schema: editor.schema}, node)) {
    const decorators = editor.schema.decorators.map(
      (decorator) => decorator.name,
    )

    for (const {node: child, path: childPath} of getChildren(editor, path)) {
      if (isSpan({schema: editor.schema}, child)) {
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
  if (isSpan({schema: editor.schema}, node)) {
    const blockPath = parentPath(path)
    const blockEntry2 = getTextBlockNode(editor, blockPath)

    if (blockEntry2) {
      const block = blockEntry2.node
      const decorators = editor.schema.decorators.map(
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
  if (isTextBlock({schema: editor.schema}, node)) {
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
  if (isTextBlock({schema: editor.schema}, node)) {
    const newMarkDefs = (node.markDefs || []).filter((def) => {
      return node.children.find((child) => {
        return (
          isSpan({schema: editor.schema}, child) &&
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

  if (isSpanNode({schema: editor.schema}, node)) {
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
  if (isObjectNode({schema: editor.schema}, node)) {
    const scopedName = getContainerScopedName(editor, node, path)
    const arrayField = editor.containers.get(scopedName)?.field

    if (arrayField) {
      const fieldValue = (node as Record<string, unknown>)[arrayField.name]
      const needsField = !Array.isArray(fieldValue)
      const needsChild = needsField || fieldValue.length === 0

      if (needsChild) {
        const childNode = buildContainerChild(editor, scopedName, arrayField)

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
  if (isObjectNode({schema: editor.schema}, node)) {
    const children = [...getChildren(editor, path)]

    if (children.length > 1) {
      const seen = new Map<string, number>()

      for (let i = 0; i < children.length; i++) {
        const key = children[i]!.node._key
        if (key !== undefined && seen.has(key)) {
          const newKey = editor.keyGenerator()
          debug.normalization('Fixing duplicate key on container child')
          // Use numeric index to address the duplicate since keyed path
          // is ambiguous for nodes with the same key.
          const childFieldName = getChildFieldName(editor, path)
          if (childFieldName) {
            editor.apply({
              type: 'set',
              path: [...path, childFieldName, i, '_key'],
              value: newKey,
              inverse: {
                type: 'set',
                path: [...path, childFieldName, i, '_key'],
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
  if (isTextBlockNode({schema: editor.schema}, node)) {
    // Runtime data can arrive without children (e.g. after an unset patch).
    if (!Array.isArray(node.children)) {
      editor.apply({
        type: 'set',
        path: [...path, 'children'],
        value: [],
        inverse: {type: 'unset', path: [...path, 'children']},
      })
      return
    }

    // We will have to refetch the element any time we modify its children
    // since it clones to a new immutable reference when we do.
    let element: PortableTextTextBlock = node

    // Ensure that text blocks have at least one child.
    if (element.children.length === 0) {
      const child = createSpanNode(editor)
      editor.apply({
        type: 'insert',
        path: [...path, 'children', 0],
        node: child,
        position: 'before',
      })
      const refetched = getTextBlockNode(editor, path)?.node
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

      if (isSpan({schema: editor.schema}, child)) {
        if (prev != null && isSpan({schema: editor.schema}, prev)) {
          // Merge adjacent text nodes that are empty or match.
          if (child.text === '') {
            editor.apply({type: 'unset', path: childPath})
            const refetched = getTextBlockNode(editor, path)?.node
            if (!refetched) {
              return
            }
            element = refetched
            n--
          } else if (prev.text === '') {
            const prevPath = [...path, 'children', {_key: prev._key}]
            editor.apply({type: 'unset', path: prevPath})
            const refetched = getTextBlockNode(editor, path)?.node
            if (!refetched) {
              return
            }
            element = refetched
            n--
          } else if (textEquals(child, prev, {loose: true})) {
            applyMergeNode(editor, childPath, prev.text.length)
            const refetched = getTextBlockNode(editor, path)?.node
            if (!refetched) {
              return
            }
            element = refetched
            n--
          }
        }
      } else if (isObjectNode({schema: editor.schema}, child)) {
        if (prev == null || !isSpan({schema: editor.schema}, prev)) {
          const newChild = createSpanNode(editor)
          editor.apply({
            type: 'insert',
            path: childPath,
            node: newChild,
            position: 'before',
          })
          const refetched = getTextBlockNode(editor, path)?.node
          if (!refetched) {
            return
          }
          element = refetched
          n++
        }
        if (n === element.children.length - 1) {
          const newChild = createSpanNode(editor)
          editor.apply({
            type: 'insert',
            path: [...path, 'children', {_key: element.children[n]!._key}],
            node: newChild,
            position: 'after',
          })
          const refetched = getTextBlockNode(editor, path)?.node
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

/**
 * Build a child node for a container field, recursively populating any
 * nested container fields so that the entire structure is created in a
 * single operation instead of cascading through multiple normalization
 * passes.
 */
function buildContainerChild(
  editor: {
    keyGenerator: () => string
    schema: Parameters<typeof createPlaceholderBlock>[0]['schema']
    containers: Containers
  },
  parentScopedName: string,
  arrayField: ChildArrayField,
): Node | undefined {
  const acceptsBlocks = arrayField.of.some(
    (definition) => definition.type === 'block',
  )

  if (acceptsBlocks) {
    return createPlaceholderBlock(editor)
  }

  const firstChildType = arrayField.of.at(0)

  if (!firstChildType || firstChildType.type === 'block') {
    return undefined
  }

  const childNode: Record<string, unknown> = {
    _type: firstChildType.type,
    _key: editor.keyGenerator(),
  }

  // Recursively populate nested container fields so the full structure
  // is built in one pass.
  const childScopedName = `${parentScopedName}.${firstChildType.type}`
  const childContainerConfig = editor.containers.get(childScopedName)
  const childArrayField = childContainerConfig?.field

  if (childArrayField) {
    const grandchild = buildContainerChild(
      editor,
      childScopedName,
      childArrayField,
    )

    if (grandchild) {
      childNode[childArrayField.name] = [grandchild]
    }
  }

  return childNode as Node
}
