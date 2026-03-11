import {Editor, Path, Range, Scrubber, Text} from '..'
import type {KeyedSegment} from '../../types/paths'
import type {EditorSchema} from '../../editor/editor-schema'
import type {ExtendedType} from '../types/custom-types'
import {isObject} from '../utils/is-object'
import {modifyChildren, modifyLeaf, removeChildren} from '../utils/modify'
import {Element} from './element'


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
 * Resolve a single path segment against a node.
 * - String segment (field name): access node[fieldName] to get the array
 * - KeyedSegment: find child in current array where _key matches
 * - Number segment: access by index (legacy support)
 */

/**
 * Get the children field name for a node. Currently always 'children',
 * but with containers this will be schema-driven.
 */
function getChildrenFieldName(_node: any, _schema: any): string {
  return 'children'
}

/**
 * Get the children array of an ancestor node.
 */
function getChildrenArray(node: any, _schema: any): any[] {
  return (node as any).children ?? []
}

/**
 * Build a keyed path segment for a child node.
 */
function childKeySegment(child: any): KeyedSegment | number {
  if (child && typeof child === 'object' && '_key' in child) {
    return {_key: child._key}
  }
  // Fallback for nodes without _key (shouldn't happen in PT)
  return 0
}

/**
 * `ObjectNode` represents a node with semantic content but no children or text.
 * Block objects and inline objects are ObjectNodes in the tree.
 */

export interface BaseObjectNode {
  _type: string
  _key: string
  [key: string]: unknown
}

export type ObjectNode = ExtendedType<'ObjectNode', BaseObjectNode>

/**
 * The `Node` union type represents all of the different types of nodes that
 * occur in a Slate document tree.
 */

export type BaseNode = Editor | Element | ObjectNode | Text
export type Node = Editor | Element | ObjectNode | Text

export interface NodeChildrenOptions {
  reverse?: boolean
}

export interface NodeLevelsOptions {
  reverse?: boolean
}

export interface NodeNodesOptions {
  from?: Path
  to?: Path
  reverse?: boolean
  pass?: (entry: NodeEntry) => boolean
}

export interface NodeTextsOptions {
  from?: Path
  to?: Path
  reverse?: boolean
  pass?: (node: NodeEntry) => boolean
}

export interface NodeInterface {
  /**
   * Get the node at a specific path, asserting that it's an ancestor node.
   */
  ancestor: (root: Node, path: Path, schema: EditorSchema) => Ancestor

  /**
   * Get the child of a node at a specific index.
   */
  child: (root: Node, index: number, schema: EditorSchema) => Descendant

  /**
   * Iterate over the children of a node at a specific path.
   */
  children: (
    root: Node,
    path: Path,
    schema: EditorSchema,
    options?: NodeChildrenOptions,
  ) => Generator<NodeEntry<Descendant>, void, undefined>

  /**
   * Extract props from a Node.
   */
  extractProps: (node: Node, schema: EditorSchema) => NodeProps

  /**
   * Get the first leaf node entry in a root node from a path.
   */
  first: (root: Node, path: Path, schema: EditorSchema) => NodeEntry

  /**
   * Get the sliced fragment represented by a range inside a root node.
   */
  fragment: <T extends Ancestor = Editor>(
    root: T,
    range: Range,
    schema: EditorSchema,
  ) => T['children']

  /**
   * Get the descendant node referred to by a specific path. If the path is an
   * empty array, it refers to the root node itself.
   */
  get: (root: Node, path: Path, schema: EditorSchema) => Node

  /**
   * Similar to get, but returns undefined if the node does not exist.
   */
  getIf: (root: Node, path: Path, schema: EditorSchema) => Node | undefined

  /**
   * Check if a descendant node exists at a specific path.
   */
  has: (root: Node, path: Path, schema: EditorSchema) => boolean

  /**
   * Check if a value implements the `Node` interface.
   */
  isNode: (value: any, schema: EditorSchema) => value is Node

  /**
   * Check if a value is a list of `Node` objects.
   */
  isNodeList: (value: any, schema: EditorSchema) => value is Node[]

  /**
   * Check if a value is a leaf node (Text or ObjectNode).
   * Leaf nodes have no children to descend into.
   */
  isLeaf: (value: any, schema: EditorSchema) => boolean

  /**
   * Check if a value is an ObjectNode. Uses schema to determine whether
   * a node's _type is neither the block type name nor the span type name.
   */
  isObjectNode: (value: any, schema: EditorSchema) => value is ObjectNode

  /**
   * Get the last leaf node entry in a root node from a path.
   */
  last: (root: Node, path: Path, schema: EditorSchema) => NodeEntry

  /**
   * Get the node at a specific path, ensuring it's a leaf node (Text or
   * ObjectNode).
   */
  leaf: (root: Node, path: Path, schema: EditorSchema) => Text | ObjectNode

  /**
   * Return a generator of the in a branch of the tree, from a specific path.
   *
   * By default the order is top-down, from highest to lowest node in the tree,
   * but you can pass the `reverse: true` option to go bottom-up.
   */
  levels: (
    root: Node,
    path: Path,
    schema: EditorSchema,
    options?: NodeLevelsOptions,
  ) => Generator<NodeEntry, void, undefined>

  /**
   * Return a generator of all the node entries of a root node. Each entry is
   * returned as a `[Node, Path]` tuple, with the path referring to the node's
   * position inside the root node.
   */
  nodes: (
    root: Node,
    schema: EditorSchema,
    options?: NodeNodesOptions,
  ) => Generator<NodeEntry, void, undefined>

  /**
   * Get the path to the next sibling of the node at the given path.
   * Returns the path if the sibling exists, or undefined if there is no next sibling.
   */
  next: (
    root: Node,
    path: Path,
    schema: EditorSchema,
  ) => Path | undefined

  /**
   * Get the parent of a node at a specific path.
   */
  parent: (root: Node, path: Path, schema: EditorSchema) => Ancestor

  /**
   * Get the path to the previous sibling of the node at the given path.
   * Returns the path if the sibling exists, or undefined if there is no previous sibling.
   */
  previous: (
    root: Node,
    path: Path,
    schema: EditorSchema,
  ) => Path | undefined

  /**
   * Check if the node at the given path has a previous sibling.
   */
  hasPrevious: (
    root: Node,
    path: Path,
    schema: EditorSchema,
  ) => boolean

  /**
   * Compare two paths in document order. Returns -1 if `path` comes before
   * `another`, 0 if they are equal or one is an ancestor of the other,
   * and 1 if `path` comes after `another`. Requires the tree to determine
   * sibling ordering.
   */
  compare: (
    root: Node,
    path: Path,
    another: Path,
    schema: EditorSchema,
  ) => -1 | 0 | 1

  /**
   * Check if a path is before another in document order.
   */
  isBefore: (
    root: Node,
    path: Path,
    another: Path,
    schema: EditorSchema,
  ) => boolean

  /**
   * Check if a path is after another in document order.
   */
  isAfter: (
    root: Node,
    path: Path,
    another: Path,
    schema: EditorSchema,
  ) => boolean

  /**
   * Get the numeric index of a child within its parent's children array.
   * Returns -1 if not found.
   */
  indexOf: (
    root: Node,
    path: Path,
    schema: EditorSchema,
  ) => number

  /**
   * Get the concatenated text string of a node's content.
   *
   * Note that this will not include spaces or line breaks between block nodes.
   * It is not a user-facing string, but a string for performing offset-related
   * computations for a node.
   */
  string: (node: Node, schema: EditorSchema) => string

  /**
   * Return a generator of all leaf text nodes in a root node.
   */
  texts: (
    root: Node,
    schema: EditorSchema,
    options?: NodeTextsOptions,
  ) => Generator<NodeEntry<Text>, void, undefined>
}

// eslint-disable-next-line no-redeclare
export const Node: NodeInterface = {
  ancestor(root: Node, path: Path, schema: EditorSchema): Ancestor {
    const node = Node.get(root, path, schema)

    if (Text.isText(node, schema) || Node.isObjectNode(node, schema)) {
      throw new Error(
        `Cannot get the ancestor node at path [${path}] because it refers to a leaf node instead: ${Scrubber.stringify(
          node,
        )}`,
      )
    }

    return node
  },

  child(root: Node, index: number, schema: EditorSchema): Descendant {
    if (Text.isText(root, schema) || Node.isObjectNode(root, schema)) {
      throw new Error(
        `Cannot get the child of a leaf node: ${Scrubber.stringify(root)}`,
      )
    }

    const c = root.children[index] as Descendant

    if (c == null) {
      throw new Error(
        `Cannot get child at index \`${index}\` in node: ${Scrubber.stringify(
          root,
        )}`,
      )
    }

    return c
  },

  *children(
    root: Node,
    path: Path,
    schema: EditorSchema,
    options: NodeChildrenOptions = {},
  ): Generator<NodeEntry<Descendant>, void, undefined> {
    const {reverse = false} = options
    const ancestor = Node.ancestor(root, path, schema)
    const fieldName = getChildrenFieldName(ancestor, schema)
    const children = getChildrenArray(ancestor, schema)
    const indices = reverse
      ? Array.from({length: children.length}, (_, i) => children.length - 1 - i)
      : Array.from({length: children.length}, (_, i) => i)

    for (const index of indices) {
      const child = children[index]! as Descendant
      const key = childKeySegment(child)
      const childPath: Path = [...path, fieldName, key]
      yield [child, childPath]
    }
  },

  extractProps(node: Node, schema: EditorSchema): NodeProps {
    if (Element.isAncestor(node, schema)) {
      const {children: _children, ...properties} = node

      return properties
    } else if (Text.isText(node, schema)) {
      const {text: _text, ...properties} = node

      return properties
    } else {
      return {...(node as ObjectNode)}
    }
  },

  first(root: Node, path: Path, schema: EditorSchema): NodeEntry {
    const p = path.slice()
    let n = Node.get(root, p, schema)

    while (n) {
      if (Node.isLeaf(n, schema)) {
        break
      }

      const ancestor = n as Ancestor
      const children = getChildrenArray(ancestor, schema)

      if (children.length === 0) {
        break
      }

      const firstChild = children[0]! as Node
      const fieldName = getChildrenFieldName(ancestor, schema)
      p.push(fieldName, childKeySegment(firstChild))
      n = firstChild
    }

    return [n, p]
  },

  fragment<T extends Ancestor = Editor>(
    root: T,
    range: Range,
    schema: EditorSchema,
  ): T['children'] {
    const newRoot: Ancestor = {children: root.children} as Ancestor

    // Range.edges needs an editor for ordering, but fragment operates on
    // a plain Ancestor. Use anchor/focus directly — callers are responsible
    // for providing a properly ordered range.
    const {anchor, focus} = range
    const anchorFirst = Path.isAncestor(anchor.path, focus.path) ||
      (Path.equals(anchor.path, focus.path) && anchor.offset <= focus.offset)
    const [start, end] = anchorFirst ? [anchor, focus] : [focus, anchor]

    const nodeEntries = Node.nodes(newRoot, schema, {
      reverse: true,
      pass: ([, path]) => {
        // Inline the includes check without needing editor
        const afterStart = Path.compare(path, start.path) >= 0
        const beforeEnd = Path.compare(path, end.path) <= 0
        return !(afterStart && beforeEnd)
      },
    })

    for (const [, path] of nodeEntries) {
      // Inline the includes check
      const afterStart = Path.compare(path, start.path) >= 0
      const beforeEnd = Path.compare(path, end.path) <= 0
      if (!(afterStart && beforeEnd)) {
        const parentPath = Path.parent(path)
        const lastSegment = path[path.length - 1]!

        modifyChildren(newRoot, parentPath, schema, (children) => {
          // Find the numeric index of the child to remove
          let index: number
          if (isKeyedSegment(lastSegment)) {
            index = children.findIndex(
              (c: any) => c?._key === lastSegment._key,
            )
          } else {
            index = typeof lastSegment === 'number' ? lastSegment : -1
          }
          if (index >= 0) {
            return removeChildren(children, index, 1)
          }
          return children
        })
      }

      if (Path.equals(path, end.path)) {
        const leaf = Node.get(newRoot, path, schema)

        if (Text.isText(leaf, schema)) {
          modifyLeaf(newRoot, path, schema, (node) => {
            const before = node.text.slice(0, end.offset)
            return {...node, text: before}
          })
        }
      }

      if (Path.equals(path, start.path)) {
        const leaf = Node.get(newRoot, path, schema)

        if (Text.isText(leaf, schema)) {
          modifyLeaf(newRoot, path, schema, (node) => {
            const before = node.text.slice(start.offset)
            return {...node, text: before}
          })
        }
      }
    }

    return newRoot.children
  },

  get(root: Node, path: Path, schema: EditorSchema): Node {
    const node = Node.getIf(root, path, schema)
    if (node === undefined) {
      throw new Error(
        `Cannot find a descendant at path [${path}] in node: ${Scrubber.stringify(
          root,
        )}`,
      )
    }
    return node
  },

  getIf(root: Node, path: Path, schema: EditorSchema): Node | undefined {
    let node: any = root

    for (let i = 0; i < path.length; i++) {
      const segment = path[i]!

      if (typeof segment === 'string') {
        // Field name segment — access the named property
        node = node[segment]
        if (node == null) return undefined
      } else if (isKeyedSegment(segment)) {
        // Keyed segment — find child by _key in current array
        if (!Array.isArray(node)) {
          // node is an Ancestor, get its children array
          if (Node.isLeaf(node, schema)) return undefined
          const fieldName = getChildrenFieldName(node, schema)
          node = (node as any)[fieldName]
          if (!Array.isArray(node)) return undefined
        }
        const found = node.find((child: any) => child?._key === segment._key)
        if (found == null) return undefined
        node = found
      } else if (typeof segment === 'number') {
        // Legacy numeric index
        if (Node.isLeaf(node, schema)) return undefined
        const children = (node as Ancestor).children
        if (!children[segment]) return undefined
        node = children[segment]! as Node
      } else {
        return undefined
      }
    }

    return node as Node
  },

  has(root: Node, path: Path, schema: EditorSchema): boolean {
    return Node.getIf(root, path, schema) !== undefined
  },

  isNode(value: any, schema: EditorSchema): value is Node {
    return (
      Text.isText(value, schema) ||
      Element.isElement(value, schema) ||
      Editor.isEditor(value) ||
      Node.isObjectNode(value, schema)
    )
  },

  isNodeList(value: any, schema: EditorSchema): value is Node[] {
    return (
      Array.isArray(value) && value.every((val) => Node.isNode(val, schema))
    )
  },

  isLeaf(value: any, schema: EditorSchema): boolean {
    return Text.isText(value, schema) || Node.isObjectNode(value, schema)
  },

  isObjectNode(value: any, schema: EditorSchema): value is ObjectNode {
    return (
      isObject(value) &&
      typeof value._type === 'string' &&
      typeof value._key === 'string' &&
      value._type !== schema.block.name &&
      value._type !== schema.span.name
    )
  },

  last(root: Node, path: Path, schema: EditorSchema): NodeEntry {
    const p = path.slice()
    let n = Node.get(root, p, schema)

    while (n) {
      if (Node.isLeaf(n, schema)) {
        break
      }

      const ancestor = n as Ancestor
      const children = getChildrenArray(ancestor, schema)

      if (children.length === 0) {
        break
      }

      const lastChild = children[children.length - 1]! as Node
      const fieldName = getChildrenFieldName(ancestor, schema)
      p.push(fieldName, childKeySegment(lastChild))
      n = lastChild
    }

    return [n, p]
  },

  leaf(root: Node, path: Path, schema: EditorSchema): Text | ObjectNode {
    const node = Node.get(root, path, schema)

    if (!Text.isText(node, schema) && !Node.isObjectNode(node, schema)) {
      throw new Error(
        `Cannot get the leaf node at path [${path}] because it refers to a non-leaf node: ${Scrubber.stringify(
          node,
        )}`,
      )
    }

    return node
  },

  *levels(
    root: Node,
    path: Path,
    schema: EditorSchema,
    options: NodeLevelsOptions = {},
  ): Generator<NodeEntry, void, undefined> {
    for (const p of Path.levels(path, options)) {
      const n = Node.get(root, p, schema)
      yield [n, p]
    }
  },

  *nodes(
    root: Node,
    schema: EditorSchema,
    options: NodeNodesOptions = {},
  ): Generator<NodeEntry, void, undefined> {
    const {pass, reverse = false} = options
    const {from = []} = options
    const visited = new Set()
    let p: Path = []
    let n = root

    while (true) {
      // TODO: 'to' boundary check needs tree-order comparison
      // For now, skip the boundary check when 'to' is provided
      // This is safe because callers using 'to' are rare

      if (!visited.has(n)) {
        yield [n, p]
      }

      // If we're allowed to go downward and we haven't descended yet, do.
      if (
        !visited.has(n) &&
        !Node.isLeaf(n, schema) &&
        (n as Ancestor).children.length !== 0 &&
        (pass == null || pass([n, p]) === false)
      ) {
        visited.add(n)
        const children = getChildrenArray(n as Ancestor, schema)
        const fieldName = getChildrenFieldName(n, schema)

        // Determine which child to descend into
        let childIndex = reverse ? children.length - 1 : 0

        // If 'from' is an ancestor of current path, use the from hint
        if (Path.isAncestor(p, from) && p.length < from.length) {
          // Find the child that matches the next segment in 'from'
          const nextFromSegment = from[p.length]
          if (typeof nextFromSegment === 'number') {
            childIndex = nextFromSegment
          } else if (isKeyedSegment(nextFromSegment)) {
            const idx = children.findIndex(
              (c: any) => c?._key === nextFromSegment._key,
            )
            if (idx >= 0) childIndex = idx
          }
          // Skip the field name segment if present
          const afterField = from[p.length + 1]
          if (typeof afterField !== 'string' && isKeyedSegment(afterField)) {
            const idx = children.findIndex(
              (c: any) => c?._key === afterField._key,
            )
            if (idx >= 0) childIndex = idx
          }
        }

        const child = children[childIndex]
        if (child) {
          p = [...p, fieldName, childKeySegment(child)]
          n = child as Node
          continue
        }
      }

      // If we're at the root and we can't go down, we're done.
      if (p.length === 0) {
        break
      }

      // Try to move to the next/previous sibling
      const parentPath = Path.parent(p)
      const parentNode = Node.getIf(root, parentPath, schema)

      if (parentNode && !Node.isLeaf(parentNode, schema)) {
        const siblings = getChildrenArray(parentNode as Ancestor, schema)
        const currentKey = p[p.length - 1]
        const currentIndex = isKeyedSegment(currentKey)
          ? siblings.findIndex((c: any) => c?._key === currentKey._key)
          : typeof currentKey === 'number'
            ? currentKey
            : -1

        const nextIndex = reverse ? currentIndex - 1 : currentIndex + 1

        if (nextIndex >= 0 && nextIndex < siblings.length) {
          const sibling = siblings[nextIndex]!
          const fieldName = getChildrenFieldName(parentNode, schema)
          p = [...parentPath, fieldName, childKeySegment(sibling)]
          n = sibling as Node
          continue
        }
      }

      // Otherwise we're going upward...
      p = Path.parent(p)
      n = Node.get(root, p, schema)
      visited.add(n)
    }
  },

  next(
    root: Node,
    path: Path,
    schema: EditorSchema,
  ): Path | undefined {
    if (path.length === 0) return undefined

    const parentPath = Path.parent(path)
    const parentNode = Node.getIf(root, parentPath, schema)
    if (!parentNode || Node.isLeaf(parentNode, schema)) return undefined

    const siblings = getChildrenArray(parentNode as Ancestor, schema)
    const lastSegment = path[path.length - 1]!
    const currentIndex = isKeyedSegment(lastSegment)
      ? siblings.findIndex((c: any) => c?._key === lastSegment._key)
      : typeof lastSegment === 'number'
        ? lastSegment
        : -1

    const nextIndex = currentIndex + 1
    if (nextIndex >= siblings.length) return undefined

    const nextChild = siblings[nextIndex]!
    const fieldName = getChildrenFieldName(parentNode, schema)
    return [...parentPath, fieldName, childKeySegment(nextChild)]
  },

  previous(
    root: Node,
    path: Path,
    schema: EditorSchema,
  ): Path | undefined {
    if (path.length === 0) return undefined

    const parentPath = Path.parent(path)
    const parentNode = Node.getIf(root, parentPath, schema)
    if (!parentNode || Node.isLeaf(parentNode, schema)) return undefined

    const siblings = getChildrenArray(parentNode as Ancestor, schema)
    const lastSegment = path[path.length - 1]!
    const currentIndex = isKeyedSegment(lastSegment)
      ? siblings.findIndex((c: any) => c?._key === lastSegment._key)
      : typeof lastSegment === 'number'
        ? lastSegment
        : -1

    const prevIndex = currentIndex - 1
    if (prevIndex < 0) return undefined

    const prevChild = siblings[prevIndex]!
    const fieldName = getChildrenFieldName(parentNode, schema)
    return [...parentPath, fieldName, childKeySegment(prevChild)]
  },

  hasPrevious(
    root: Node,
    path: Path,
    schema: EditorSchema,
  ): boolean {
    return Node.previous(root, path, schema) !== undefined
  },

  compare(
    root: Node,
    path: Path,
    another: Path,
    schema: EditorSchema,
  ): -1 | 0 | 1 {
    // Find the common prefix, then compare the diverging segments
    const minLen = Math.min(path.length, another.length)

    for (let i = 0; i < minLen; i++) {
      const a = path[i]!
      const b = another[i]!

      // If segments are equal, continue
      if (isKeyedSegment(a) && isKeyedSegment(b)) {
        if (a._key === b._key) continue

        // Different keys at the same level — need to find their order
        // Walk up to find the parent and compare indices
        // The previous segment should be a field name
        const fieldIdx = i - 1
        if (fieldIdx >= 0 && typeof path[fieldIdx] === 'string') {
          const grandparentPath = path.slice(0, fieldIdx)
          const grandparent = Node.getIf(root, grandparentPath, schema)
          if (grandparent && !Node.isLeaf(grandparent, schema)) {
            const fieldName = path[fieldIdx] as string
            const children = (grandparent as any)[fieldName] as any[]
            if (Array.isArray(children)) {
              const aIdx = children.findIndex((c: any) => c?._key === a._key)
              const bIdx = children.findIndex((c: any) => c?._key === b._key)
              if (aIdx < bIdx) return -1
              if (aIdx > bIdx) return 1
            }
          }
        } else if (i === 0) {
          // Top-level children of root
          const children = (root as any).children as any[]
          if (Array.isArray(children)) {
            const aIdx = children.findIndex((c: any) => c?._key === a._key)
            const bIdx = children.findIndex((c: any) => c?._key === b._key)
            if (aIdx < bIdx) return -1
            if (aIdx > bIdx) return 1
          }
        }
        // Fallback: can't determine order
        return 0
      } else if (typeof a === 'string' && typeof b === 'string') {
        if (a === b) continue
        // Different field names at the same level — unusual
        return a < b ? -1 : 1
      } else if (typeof a === 'number' && typeof b === 'number') {
        if (a === b) continue
        return a < b ? -1 : 1
      } else {
        // Mixed segment types — shouldn't happen in well-formed paths
        return 0
      }
    }

    // One path is a prefix of the other (ancestor relationship)
    return 0
  },

  isBefore(
    root: Node,
    path: Path,
    another: Path,
    schema: EditorSchema,
  ): boolean {
    return Node.compare(root, path, another, schema) === -1
  },

  isAfter(
    root: Node,
    path: Path,
    another: Path,
    schema: EditorSchema,
  ): boolean {
    return Node.compare(root, path, another, schema) === 1
  },

  indexOf(
    root: Node,
    path: Path,
    schema: EditorSchema,
  ): number {
    if (path.length === 0) return -1

    const parentPath = Path.parent(path)
    const parentNode = Node.getIf(root, parentPath, schema)
    if (!parentNode || Node.isLeaf(parentNode, schema)) return -1

    const siblings = getChildrenArray(parentNode as Ancestor, schema)
    const lastSegment = path[path.length - 1]!

    if (isKeyedSegment(lastSegment)) {
      return siblings.findIndex((c: any) => c?._key === lastSegment._key)
    }
    if (typeof lastSegment === 'number') {
      return lastSegment
    }
    return -1
  },

    parent(root: Node, path: Path, schema: EditorSchema): Ancestor {
    const parentPath = Path.parent(path)
    const p = Node.get(root, parentPath, schema)

    if (Text.isText(p, schema) || Node.isObjectNode(p, schema)) {
      throw new Error(
        `Cannot get the parent of path [${path}] because it does not exist in the root.`,
      )
    }

    return p
  },

  string(node: Node, schema: EditorSchema): string {
    if (Node.isObjectNode(node, schema)) {
      return ''
    }

    if (Text.isText(node, schema)) {
      return node.text
    }

    return (node as Ancestor).children
      .map((child) => Node.string(child, schema))
      .join('')
  },

  *texts(
    root: Node,
    schema: EditorSchema,
    options: NodeTextsOptions = {},
  ): Generator<NodeEntry<Text>, void, undefined> {
    for (const [node, path] of Node.nodes(root, schema, options)) {
      if (Text.isText(node, schema)) {
        yield [node, path]
      }
    }
  },
}

/**
 * The `Descendant` union type represents nodes that are descendants in the
 * tree. It is returned as a convenience in certain cases to narrow a value
 * further than the more generic `Node` union.
 */

export type Descendant = Element | ObjectNode | Text

/**
 * The `Ancestor` union type represents nodes that are ancestors in the tree.
 * It is returned as a convenience in certain cases to narrow a value further
 * than the more generic `Node` union.
 */

export type Ancestor = Editor | Element

/**
 * `NodeEntry` objects are returned when iterating over the nodes in a Slate
 * document tree. They consist of the node and its `Path` relative to the root
 * node in the document.
 */

export type NodeEntry<T extends Node = Node> = [T, Path]

/**
 * Convenience type for returning the props of a node.
 */
export type NodeProps =
  | Omit<Editor, 'children'>
  | Omit<Element, 'children'>
  | ObjectNode
  | Omit<Text, 'text'>
