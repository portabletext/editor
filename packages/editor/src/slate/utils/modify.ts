import type {EditorSchema} from '../../editor/editor-schema'
import {safeStringify} from '../../internal-utils/safe-json'
import type {KeyedSegment, PathSegment} from '../../types/paths'
import {
  Node,
  Scrubber,
  Text,
  type Ancestor,
  type Descendant,
  type Element,
  type Path,
} from '../interfaces'

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
 *
 * Supports both numeric Slate paths and PTE paths with keyed segments
 * and field name segments for navigating into block objects.
 */
export const modifyDescendant = <N extends Descendant>(
  root: Ancestor,
  path: ReadonlyArray<PathSegment>,
  _schema: EditorSchema,
  f: (node: N) => N,
) => {
  if (path.length === 0) {
    throw new Error('Cannot modify the editor')
  }

  const node = getDeepNode(root, path) as N
  const segments = [...path]
  let modifiedNode: unknown = f(node)

  while (segments.length > 1) {
    const segment = segments.pop()!
    const parent = getDeepNode(root, segments)

    modifiedNode = replaceAtSegment(parent, segment, modifiedNode)
  }

  const firstSegment = segments[0]!

  if (typeof firstSegment === 'number') {
    root.children = replaceChildren(
      root.children,
      firstSegment,
      1,
      modifiedNode as Descendant,
    )
  } else if (isKeyedSegment(firstSegment)) {
    root.children = root.children.map((child) =>
      (child as Record<string, unknown>)['_key'] === firstSegment._key
        ? (modifiedNode as Descendant)
        : child,
    )
  } else {
    throw new Error(
      `Expected numeric or keyed first path segment, got ${safeStringify(firstSegment)}`,
    )
  }
}

function getDeepNode(root: unknown, path: ReadonlyArray<PathSegment>): unknown {
  let current: unknown = root

  for (const segment of path) {
    if (typeof segment === 'number') {
      current = (current as Ancestor).children[segment]
    } else if (typeof segment === 'string') {
      current = (current as Record<string, unknown>)[segment]
    } else if (isKeyedSegment(segment)) {
      const arr = Array.isArray(current)
        ? current
        : (current as Ancestor).children
      current = arr.find(
        (item) => (item as Record<string, unknown>)['_key'] === segment._key,
      )
    }

    if (current === undefined) {
      throw new Error(`Cannot find node at path ${safeStringify(path)}`)
    }
  }

  return current
}

function replaceAtSegment(
  parent: unknown,
  segment: PathSegment,
  value: unknown,
): unknown {
  if (typeof segment === 'number') {
    const ancestor = parent as Ancestor
    return {
      ...ancestor,
      children: replaceChildren(
        ancestor.children,
        segment,
        1,
        value as Descendant,
      ),
    }
  }

  if (typeof segment === 'string') {
    return {...(parent as Record<string, unknown>), [segment]: value}
  }

  if (isKeyedSegment(segment)) {
    if (Array.isArray(parent)) {
      return (parent as Array<Record<string, unknown>>).map((item) =>
        item['_key'] === segment._key ? value : item,
      )
    }

    const ancestor = parent as Ancestor
    return {
      ...ancestor,
      children: ancestor.children.map((item) =>
        (item as Record<string, unknown>)['_key'] === segment._key
          ? value
          : item,
      ) as Descendant[],
    }
  }

  throw new Error(`Unexpected path segment: ${safeStringify(segment)}`)
}

function isKeyedSegment(segment: PathSegment): segment is KeyedSegment {
  return (
    typeof segment === 'object' &&
    segment !== null &&
    '_key' in segment &&
    typeof (segment as KeyedSegment)._key === 'string'
  )
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
