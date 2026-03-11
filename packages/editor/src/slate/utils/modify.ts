import type {EditorSchema} from '../../editor/editor-schema'
import type {KeyedSegment} from '../../types/paths'
import {
  Node,
  Scrubber,
  Text,
  type Ancestor,
  type Descendant,
  type Element,
  type Path,
} from '../interfaces'

/**
 * Check if a value is a KeyedSegment ({_key: string}).
 */
function isKeyedSegment(value: unknown): value is KeyedSegment {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_key' in value &&
    typeof (value as KeyedSegment)._key === 'string'
  )
}

/**
 * Resolve a path segment to a numeric index in a children array.
 */
function resolveIndex(children: Descendant[], segment: unknown): number {
  if (typeof segment === 'number') {
    return segment
  }
  if (isKeyedSegment(segment)) {
    return children.findIndex(
      (c: any) => c?._key === (segment as KeyedSegment)._key,
    )
  }
  return -1
}

export const insertChildren = <T>(
  xs: T[],
  index: number,
  ...newValues: T[]
) => [...xs.slice(0, index), ...newValues, ...xs.slice(index)]

export const replaceChildren = <T>(
  xs: T[],
  index: number,
  removeCount: number,
  ...newValues: T[]
) => [...xs.slice(0, index), ...newValues, ...xs.slice(index + removeCount)]

export const removeChildren = replaceChildren

/**
 * Replace a descendant with a new node, replacing all ancestors.
 * With keyed paths, segments alternate between field names (strings)
 * and keyed segments ({_key}). We walk up the path, resolving each
 * keyed segment to a numeric index for array splicing.
 */
export const modifyDescendant = <N extends Descendant>(
  root: Ancestor,
  path: Path,
  schema: EditorSchema,
  f: (node: N) => N,
) => {
  if (path.length === 0) {
    throw new Error('Cannot modify the editor')
  }

  const node = Node.get(root, path, schema) as N
  const segments = path.slice()
  let modifiedNode: Node = f(node)

  // Walk up the path, rebuilding ancestors
  while (segments.length > 0) {
    const lastSegment = segments[segments.length - 1]!

    if (isKeyedSegment(lastSegment) || typeof lastSegment === 'number') {
      // This is a child identifier — pop it and the preceding field name
      segments.pop() // pop the keyed segment or index

      // Get the ancestor at the remaining path
      if (segments.length === 0) {
        // We're at the root
        const index = resolveIndex(root.children, lastSegment)
        if (index >= 0) {
          root.children = replaceChildren(
            root.children,
            index,
            1,
            modifiedNode,
          )
        }
        return
      }

      // Pop the field name if present
      const fieldSegment = segments[segments.length - 1]
      if (typeof fieldSegment === 'string') {
        segments.pop()
      }

      // Get the ancestor and replace the child
      const ancestorNode =
        segments.length === 0
          ? root
          : (Node.get(root, segments, schema) as Ancestor)
      const fieldName =
        typeof fieldSegment === 'string' ? fieldSegment : 'children'
      const children = (ancestorNode as any)[fieldName] as Descendant[]
      const index = resolveIndex(children, lastSegment)

      if (index >= 0) {
        modifiedNode = {
          ...ancestorNode,
          [fieldName]: replaceChildren(children, index, 1, modifiedNode),
        }
      }
    } else if (typeof lastSegment === 'string') {
      // Field name without a preceding keyed segment — shouldn't happen
      // in well-formed paths, but handle gracefully
      segments.pop()
    } else {
      segments.pop()
    }
  }

  // If we get here, the modified node is the new root child
  // This handles the case where the path was just a keyed segment
}

/**
 * Replace the children of a node, replacing all ancestors
 */
export const modifyChildren = (
  root: Ancestor,
  path: Path,
  schema: EditorSchema,
  f: (children: Descendant[]) => Descendant[],
) => {
  if (path.length === 0) {
    root.children = f(root.children)
  } else {
    modifyDescendant<Element>(root, path, schema, (node) => {
      if (Text.isText(node, schema) || Node.isObjectNode(node, schema)) {
        throw new Error(
          `Cannot get the element at path [${path}] because it refers to a leaf node: ${Scrubber.stringify(
            node,
          )}`,
        )
      }

      return {...node, children: f(node.children)}
    })
  }
}

/**
 * Replace a leaf, replacing all ancestors
 */
export const modifyLeaf = (
  root: Ancestor,
  path: Path,
  schema: EditorSchema,
  f: (leaf: Text) => Text,
) =>
  modifyDescendant(root, path, schema, (node) => {
    if (!Text.isText(node, schema)) {
      throw new Error(
        `Cannot get the leaf node at path [${path}] because it refers to a non-leaf node: ${Scrubber.stringify(
          node,
        )}`,
      )
    }

    return f(node)
  })
