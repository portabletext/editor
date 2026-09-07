import {
  isSpan,
  isTextBlock,
  type PortableTextBlock,
  type PortableTextSpan,
} from '@portabletext/schema'
import {resolveContainerAt} from '../../schema/resolve-container-at'
import {getNodeChildren} from '../../traversal/get-children'
import {getNode} from '../../traversal/get-node'
import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import type {Path} from '../interfaces/path'

export function insertChildren<T>(
  xs: T[],
  index: number,
  ...newValues: T[]
): T[] {
  const result = xs.slice()
  result.splice(index, 0, ...newValues)
  return result
}

function replaceChildren<T>(
  xs: T[],
  index: number,
  removeCount: number,
  ...newValues: T[]
): T[] {
  const result = xs.slice()
  result.splice(index, removeCount, ...newValues)
  return result
}

export const removeChildren = replaceChildren

/**
 * Replace a descendant with a new node, replacing all ancestors
 */
export const modifyDescendant = <N extends Node>(
  editor: Editor,
  path: Path,
  f: (node: N) => N,
): void => {
  if (path.length === 0) {
    return
  }

  const context = {
    schema: editor.snapshot.context.schema,
    containers: editor.snapshot.context.containers,
  }
  const nodeEntry = getNode(editor.snapshot, path)
  if (!nodeEntry) {
    return
  }

  // One ordered node-segment list per path: keyed segments identify
  // siblings by `_key`, numeric segments by index (resolved paths carry
  // numbers for nodes normalization has not keyed yet). The input path's
  // numeric segments win over resolved keyed lookups: with duplicate
  // keys, a keyed lookup finds the first match regardless of which
  // sibling the caller addressed.
  const resolvedNodeSegments = nodeEntry.path.filter(
    (segment) => typeof segment !== 'string',
  )
  const inputNodeSegments = path.filter(
    (segment) => typeof segment !== 'string',
  )

  // Walk down once, capturing at each level the parent's child array,
  // its field name, and the child's concrete index. The captures are
  // everything the bottom-up rebuild needs; no re-resolution against a
  // value that is about to change.
  const levels: Array<{
    parentNode: Node | {value: Array<Node>}
    fieldName: string
    children: Array<Node>
    index: number
  }> = []
  let currentNode: Node | {value: Array<Node>} = {
    value: editor.snapshot.context.value,
  }
  let currentParent:
    | import('../../schema/resolve-containers').RegisteredContainer
    | undefined

  for (let i = 0; i < resolvedNodeSegments.length; i++) {
    const result = getNodeChildren(context, currentNode, currentParent)
    if (!result) {
      return
    }

    const inputSegment = inputNodeSegments[i]
    const resolvedSegment = resolvedNodeSegments[i]!
    let index: number
    if (typeof inputSegment === 'number') {
      index = inputSegment
    } else if (typeof resolvedSegment === 'number') {
      index = resolvedSegment
    } else if (isKeyedSegment(resolvedSegment)) {
      index = result.children.findIndex(
        (child) => child._key === resolvedSegment._key,
      )
    } else {
      return
    }

    const child = result.children[index]
    if (!child) {
      return
    }

    levels.push({
      parentNode: currentNode,
      fieldName: result.fieldName,
      children: result.children,
      index,
    })
    currentNode = child
    currentParent = result.parent
  }

  const deepestLevel = levels.length - 1
  if (deepestLevel < 0) {
    return
  }

  let modifiedNode: Node = f(currentNode as N)

  for (let level = deepestLevel; level >= 1; level--) {
    const {parentNode, fieldName, children, index} = levels[level]!
    modifiedNode = {
      ...(parentNode as Node),
      [fieldName]: replaceChildren(children, index, 1, modifiedNode),
    }
  }

  editor.snapshot.context.value = replaceChildren(
    editor.snapshot.context.value,
    levels[0]!.index,
    1,
    modifiedNode,
  ) as PortableTextBlock[]
}

/**
 * Replace the children of a node, replacing all ancestors.
 *
 * When path is empty, modifies the editor's children directly.
 * When path points to a node, resolves the correct child field name
 * via getNodeChildren and modifies that field.
 */
export const modifyChildren = (
  editor: Editor,
  path: Path,
  f: (children: Node[]) => Node[],
) => {
  if (path.length === 0) {
    editor.snapshot.context.value = f(
      editor.snapshot.context.value,
    ) as PortableTextBlock[]
  } else {
    const context = {
      schema: editor.snapshot.context.schema,
      containers: editor.snapshot.context.containers,
    }

    const nodeEntry = getNode(editor.snapshot, path)
    if (!nodeEntry) {
      return
    }

    // Resolve this node's positional container entry directly so the
    // correct `field` is used regardless of whether `_type` is
    // registered globally or only as a positional override.
    const resolved = resolveContainerAt(
      context.containers,
      editor.snapshot.context.value,
      path,
    )
    let fieldName: string
    if (resolved && 'field' in resolved) {
      fieldName = resolved.field.name
    } else if (isTextBlock(context, nodeEntry.node)) {
      fieldName = 'children'
    } else {
      fieldName = 'children'
    }

    modifyDescendant(editor, path, (node) => {
      const record = node as Record<string, unknown>
      const currentChildren = Array.isArray(record[fieldName])
        ? (record[fieldName] as Node[])
        : []
      return {
        ...node,
        [fieldName]: f(currentChildren),
      }
    })
  }
}

/**
 * Replace a leaf, replacing all ancestors
 */
export const modifyLeaf = (
  editor: Editor,
  path: Path,
  f: (leaf: PortableTextSpan) => PortableTextSpan,
) =>
  modifyDescendant(editor, path, (node) => {
    if (!isSpan({schema: editor.snapshot.context.schema}, node)) {
      return node
    }

    return f(node)
  })
