import * as Y from 'yjs'
import {Element, Text, type Descendant, type Node} from '../slate'

type InsertDelta = Array<{
  insert: string | Y.XmlText
  attributes?: Record<string, string>
}>

/**
 * Converts Slate children to a Y.XmlText insert delta.
 *
 * Text nodes become string inserts with `_key` and `marks` attributes.
 * Element nodes become embedded Y.XmlText inserts.
 */
export function slateNodesToInsertDelta(nodes: Node[]): InsertDelta {
  return nodes.map((node) => {
    if (Text.isText(node)) {
      const attributes: Record<string, string> = {}
      const {text, ...rest} = node
      for (const [key, value] of Object.entries(rest)) {
        attributes[key] =
          typeof value === 'string' ? value : JSON.stringify(value)
      }
      return {insert: text, attributes}
    }

    if (Element.isElement(node)) {
      return {insert: slateElementToYText(node)}
    }

    return {insert: ''}
  })
}

/**
 * Converts a Slate element (block or inline) to a Y.XmlText node.
 *
 * Element properties (excluding `children`) are stored as Y.XmlText
 * attributes. The element's children are converted to a delta and
 * applied to the Y.XmlText content.
 */
export function slateElementToYText(element: Element): Y.XmlText {
  const yText = new Y.XmlText()

  const {children, ...props} = element

  for (const [key, value] of Object.entries(props)) {
    if (key === 'markDefs') {
      yText.setAttribute(key, JSON.stringify(value))
    } else if (typeof value === 'string') {
      yText.setAttribute(key, value)
    } else if (typeof value === 'boolean') {
      yText.setAttribute(key, JSON.stringify(value))
    } else if (typeof value === 'number') {
      yText.setAttribute(key, JSON.stringify(value))
    } else if (value !== undefined) {
      yText.setAttribute(key, JSON.stringify(value))
    }
  }

  const delta = slateNodesToInsertDelta(children)
  yText.applyDelta(delta)

  return yText
}

/**
 * Converts a Y.XmlText node back to a Slate element.
 *
 * Reads attributes for element properties and converts the
 * Y.XmlText delta back to Slate children.
 */
export function yTextToSlateElement(yText: Y.XmlText): Element {
  const attributes = yText.getAttributes()
  const props: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'markDefs') {
      props[key] = JSON.parse(value as string)
    } else if (key === '__inline') {
      props[key] = JSON.parse(value as string)
    } else if (key === 'value') {
      props[key] = JSON.parse(value as string)
    } else if (key === 'level') {
      props[key] = JSON.parse(value as string)
    } else {
      props[key] = value
    }
  }

  const delta = yText.toDelta() as Array<{
    insert: string | Y.XmlText
    attributes?: Record<string, string>
  }>

  const children = delta.map(deltaInsertToSlateNode)

  if (children.length === 0) {
    // Slate requires at least one child
    children.push({text: ''} as unknown as Descendant)
  }

  return {...props, children} as Element
}

/**
 * Converts a single Y.XmlText delta entry to a Slate node.
 *
 * String inserts become Text nodes. Y.XmlText embeds become
 * Element nodes (via recursive `yTextToSlateElement`).
 */
export function deltaInsertToSlateNode(insert: {
  insert: string | Y.XmlText
  attributes?: Record<string, string>
}): Descendant {
  if (insert.insert instanceof Y.XmlText) {
    return yTextToSlateElement(insert.insert)
  }

  const node: Record<string, unknown> = {text: insert.insert}
  const attributes = insert.attributes ?? {}

  for (const [key, value] of Object.entries(attributes)) {
    node[key] = key === 'marks' ? JSON.parse(value) : value
  }

  return node as unknown as Descendant
}

/**
 * Creates a Y.Doc populated with the given Slate nodes as a shared root.
 *
 * The shared root is a Y.XmlText stored under the key `"content"` in the
 * Y.Doc. Each top-level Slate element becomes an embedded Y.XmlText child.
 */
export function slateNodesToYDoc(nodes: Node[]): Y.Doc {
  const yDoc = new Y.Doc()
  const sharedRoot = yDoc.get('content', Y.XmlText) as Y.XmlText

  const delta = slateNodesToInsertDelta(nodes)
  sharedRoot.applyDelta(delta)

  return yDoc
}

/**
 * Returns the shared root Y.XmlText from a Y.Doc.
 */
export function getSharedRoot(yDoc: Y.Doc): Y.XmlText {
  return yDoc.get('content', Y.XmlText) as Y.XmlText
}
