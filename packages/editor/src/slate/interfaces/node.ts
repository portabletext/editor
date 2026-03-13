import {Path, Range, Scrubber, Text, type Editor} from '..'
import type {EditorSchema} from '../../editor/editor-schema'
import {isEditor} from '../editor/is-editor'
import type {ExtendedType} from '../types/custom-types'
import {isObject} from '../utils/is-object'
import {modifyChildren, modifyLeaf, removeChildren} from '../utils/modify'
import {Element} from './element'

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
   * Get the parent of a node at a specific path.
   */
  parent: (root: Node, path: Path, schema: EditorSchema) => Ancestor

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
    const {children} = ancestor
    let index = reverse ? children.length - 1 : 0

    while (reverse ? index >= 0 : index < children.length) {
      const child = Node.child(ancestor, index, schema)
      const childPath = path.concat(index)
      yield [child, childPath]
      index = reverse ? index - 1 : index + 1
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

      if (ancestor.children.length === 0) {
        break
      }

      n = ancestor.children[0]! as Node
      p.push(0)
    }

    return [n, p]
  },

  fragment<T extends Ancestor = Editor>(
    root: T,
    range: Range,
    schema: EditorSchema,
  ): T['children'] {
    const newRoot: Ancestor = {children: root.children} as Ancestor

    const [start, end] = Range.edges(range)
    const nodeEntries = Node.nodes(newRoot, schema, {
      reverse: true,
      pass: ([, path]) => !Range.includes(range, path),
    })

    for (const [, path] of nodeEntries) {
      if (!Range.includes(range, path)) {
        const index = path[path.length - 1]!

        modifyChildren(newRoot, Path.parent(path), schema, (children) =>
          removeChildren(children, index, 1),
        )
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
    let node = root

    for (let i = 0; i < path.length; i++) {
      const p = path[i]!

      if (Node.isLeaf(node, schema)) {
        return
      }

      const children = (node as Ancestor).children

      if (!children[p]) {
        return
      }

      node = children[p]! as Node
    }

    return node
  },

  has(root: Node, path: Path, schema: EditorSchema): boolean {
    let node = root

    for (let i = 0; i < path.length; i++) {
      const p = path[i]!

      if (Node.isLeaf(node, schema)) {
        return false
      }

      const children = (node as Ancestor).children

      if (!children[p]) {
        return false
      }

      node = children[p]! as Node
    }

    return true
  },

  isNode(value: any, schema: EditorSchema): value is Node {
    return (
      Text.isText(value, schema) ||
      Element.isElement(value, schema) ||
      isEditor(value) ||
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

      if (ancestor.children.length === 0) {
        break
      }

      const i = ancestor.children.length - 1
      n = ancestor.children[i]! as Node
      p.push(i)
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
    const {from = [], to} = options
    const visited = new Set()
    let p: Path = []
    let n = root

    while (true) {
      if (to && (reverse ? Path.isBefore(p, to) : Path.isAfter(p, to))) {
        break
      }

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
        const children = (n as Ancestor).children
        let nextIndex = reverse ? children.length - 1 : 0

        if (Path.isAncestor(p, from)) {
          nextIndex = from[p.length]!
        }

        p = p.concat(nextIndex)
        n = Node.get(root, p, schema)
        continue
      }

      // If we're at the root and we can't go down, we're done.
      if (p.length === 0) {
        break
      }

      // If we're going forward...
      if (!reverse) {
        const newPath = Path.next(p)

        if (Node.has(root, newPath, schema)) {
          p = newPath
          n = Node.get(root, p, schema)
          continue
        }
      }

      // If we're going backward...
      if (reverse && p[p.length - 1] !== 0) {
        const newPath = Path.previous(p)
        p = newPath
        n = Node.get(root, p, schema)
        continue
      }

      // Otherwise we're going upward...
      p = Path.parent(p)
      n = Node.get(root, p, schema)
      visited.add(n)
    }
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
