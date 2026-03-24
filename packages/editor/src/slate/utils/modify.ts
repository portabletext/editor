import {
  isSpan,
  isTextBlock,
  type OfDefinition,
  type PortableTextSpan,
} from '@portabletext/schema'
import type {EditorSchema} from '../../editor/editor-schema'
import {safeStringify} from '../../internal-utils/safe-json'
import {getNodeChildren} from '../../node-traversal/get-children'
import {getNode} from '../../node-traversal/get-node'
import {resolveChildArrayField} from '../../schema/resolve-child-array-field'
import {isEditor} from '../editor/is-editor'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {isObjectNode} from '../node/is-object-node'

export const insertChildren = <T>(
  xs: T[],
  index: number,
  ...newValues: T[]
) => [...xs.slice(0, index), ...newValues, ...xs.slice(index)]

const replaceChildren = <T>(
  xs: T[],
  index: number,
  removeCount: number,
  ...newValues: T[]
) => [...xs.slice(0, index), ...newValues, ...xs.slice(index + removeCount)]

export const removeChildren = replaceChildren

/**
 * Resolve the child field name for a node. Returns `'children'` for text
 * blocks and the schema-defined field name for container objects.
 */
function resolveChildFieldName(
  context: {schema: EditorSchema},
  node: Node,
  scope: ReadonlyArray<OfDefinition> | undefined,
): string {
  if (isTextBlock(context, node)) {
    return 'children'
  }

  if (isObjectNode(context, node)) {
    const field = resolveChildArrayField({schema: context.schema, scope}, node)
    if (field) {
      return field.name
    }
  }

  return 'children'
}

/**
 * Replace a descendant with a new node, replacing all ancestors
 */
export const modifyDescendant = <N extends Node>(
  root: Editor | Node,
  path: Path,
  schema: EditorSchema,
  f: (node: N) => N,
) => {
  if (path.length === 0) {
    throw new Error('Cannot modify the editor')
  }

  const editableTypes = isEditor(root) ? root.editableTypes : new Set<string>()
  const context = {schema, editableTypes}
  const typedRoot = isEditor(root)
    ? root
    : isTextBlock({schema}, root)
      ? root
      : undefined

  if (!typedRoot) {
    throw new Error('Cannot modify descendant: root has no children')
  }
  const nodeEntry = getNode({...context, value: typedRoot.children}, path)
  if (!nodeEntry) {
    throw new Error(`Cannot find a descendant at path [${path}]`)
  }
  const node = nodeEntry.node
  const slicedPath = path.slice()
  let modifiedNode: Node = f(node as N)

  // Walk from root to target, collecting the child field name at each
  // ancestor level so we can write back to the correct field when
  // rebuilding the ancestor chain.
  const fieldNames: Array<string> = []
  let currentScope: ReadonlyArray<OfDefinition> | undefined = undefined
  let currentScopePath = ''
  let walkChildren: Array<Node> = typedRoot.children

  for (let i = 0; i < path.length - 1; i++) {
    const walkNode = walkChildren.at(path.at(i)!)

    if (!walkNode) {
      throw new Error(`Cannot find ancestor at path [${path.slice(0, i + 1)}]`)
    }

    const childInfo = getNodeChildren(
      context,
      walkNode,
      currentScope,
      currentScopePath,
    )

    if (!childInfo) {
      // Leaf node - shouldn't happen since getNode validated the path
      fieldNames.push('children')
    } else {
      fieldNames.push(resolveChildFieldName({schema}, walkNode, currentScope))
      currentScope = childInfo.scope
      currentScopePath = childInfo.scopePath
      walkChildren = childInfo.children
    }
  }

  while (slicedPath.length > 1) {
    const index = slicedPath.pop()!
    const fieldName = fieldNames.pop()!
    const ancestorEntry = getNode(
      {...context, value: typedRoot.children},
      slicedPath,
    )
    if (!ancestorEntry) {
      throw new Error(`Cannot find ancestor at path [${slicedPath}]`)
    }
    const ancestorNode = ancestorEntry.node

    modifiedNode = {
      ...ancestorNode,
      [fieldName]: replaceChildren(
        (ancestorNode as Record<string, unknown>)[fieldName] as Array<Node>,
        index,
        1,
        modifiedNode,
      ),
    }
  }

  const index = slicedPath.pop()!
  const newRootChildren = replaceChildren(
    isEditor(root)
      ? root.children
      : isTextBlock({schema}, root)
        ? root.children
        : [],
    index,
    1,
    modifiedNode,
  )
  ;(root as {children: Node[]}).children = newRootChildren
}

/**
 * Replace the children of a node, replacing all ancestors
 */
export const modifyChildren = (
  root: Editor | Node,
  path: Path,
  schema: EditorSchema,
  f: (children: Node[]) => Node[],
) => {
  if (path.length === 0) {
    ;(root as {children: Node[]}).children = f(
      isEditor(root)
        ? root.children
        : isTextBlock({schema}, root)
          ? root.children
          : [],
    )
  } else {
    const editableTypes = isEditor(root)
      ? root.editableTypes
      : new Set<string>()

    // Walk from root to the target node to build up scope context
    // so we can resolve the correct child field name.
    let currentScope: ReadonlyArray<OfDefinition> | undefined = undefined
    let currentScopePath = ''
    const context = {schema, editableTypes}
    let walkChildren: Array<Node> = isEditor(root)
      ? root.children
      : isTextBlock({schema}, root)
        ? root.children
        : []

    for (let i = 0; i < path.length; i++) {
      const walkNode = walkChildren.at(path.at(i)!)

      if (!walkNode) {
        break
      }

      const childInfo = getNodeChildren(
        context,
        walkNode,
        currentScope,
        currentScopePath,
      )

      if (childInfo) {
        // Only update scope if this is NOT the target node (last in path).
        // For the target node, we need the scope from its PARENT to resolve
        // its own child field.
        if (i < path.length - 1) {
          currentScope = childInfo.scope
          currentScopePath = childInfo.scopePath
          walkChildren = childInfo.children
        }
      }
    }

    const scopeForTarget = currentScope
    modifyDescendant(root, path, schema, (node) => {
      const childInfo = getNodeChildren(
        context,
        node,
        scopeForTarget,
        currentScopePath,
      )

      if (!childInfo) {
        throw new Error(
          `Cannot get the element at path [${path}] because it refers to a leaf node: ${safeStringify(
            node,
          )}`,
        )
      }

      const fieldName = resolveChildFieldName({schema}, node, scopeForTarget)

      return {
        ...node,
        [fieldName]: f(childInfo.children),
      }
    })
  }
}

/**
 * Replace a leaf, replacing all ancestors
 */
export const modifyLeaf = (
  root: Editor | Node,
  path: Path,
  schema: EditorSchema,
  f: (leaf: PortableTextSpan) => PortableTextSpan,
) =>
  modifyDescendant(root, path, schema, (node) => {
    if (!isSpan({schema}, node)) {
      throw new Error(
        `Cannot get the leaf node at path [${path}] because it refers to a non-leaf node: ${safeStringify(
          node,
        )}`,
      )
    }

    return f(node)
  })
