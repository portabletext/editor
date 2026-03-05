import * as Y from 'yjs'
import {Editor, Element, Node, Text, type Descendant} from '../slate'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {deltaInsertToSlateNode, yTextToSlateElement} from './convert'

/**
 * Checks if a node has children (either an Element or the Editor root).
 * Slate's `Element.isElement()` returns false for the editor root, but
 * the editor root has `children` just like elements do.
 */
function hasChildren(node: Node): node is Element {
  return Element.isElement(node) || Editor.isEditor(node)
}

/**
 * Translates Yjs `observeDeep` events into Slate operations and applies
 * them to the editor.
 *
 * Events are processed in reverse order to avoid path invalidation
 * (deleting child at index 3 before child at index 1 would shift indices).
 *
 * All operations are applied without normalizing, patching, or history
 * recording — those wrappers are applied by the caller (`withYjs`).
 */
export function applyYjsEvents(
  sharedRoot: Y.XmlText,
  editor: PortableTextSlateEditor,
  events: Y.YEvent<Y.XmlText>[],
): void {
  // Process events in reverse order to maintain path validity
  const sortedEvents = [...events].reverse()

  for (const event of sortedEvents) {
    if (!(event instanceof Y.YTextEvent)) {
      continue
    }

    const yText = event.target as Y.XmlText
    const slatePath = yTextToSlatePath(sharedRoot, yText)

    if (!slatePath) {
      continue
    }

    if (event.keysChanged.size > 0) {
      applyAttributeChanges(editor, slatePath, yText, event)
    }

    if (event.delta.length > 0) {
      applyDeltaChanges(editor, slatePath, yText, event)
    }
  }
}

/**
 * Resolves a Y.XmlText instance back to a Slate path by walking up the
 * Y.XmlText tree until we reach the shared root.
 */
function yTextToSlatePath(
  sharedRoot: Y.XmlText,
  yText: Y.XmlText,
): number[] | null {
  if (yText === sharedRoot) {
    return []
  }

  const path: number[] = []
  let current: Y.XmlText = yText

  while (current !== sharedRoot) {
    const parent = current._item?.parent
    if (!(parent instanceof Y.XmlText)) {
      return null
    }

    const index = getChildIndex(parent, current)
    if (index === null) {
      return null
    }

    path.unshift(index)
    current = parent
  }

  return path
}

/**
 * Finds the Slate child index of a Y.XmlText within its parent's delta.
 */
function getChildIndex(parent: Y.XmlText, child: Y.XmlText): number | null {
  const delta = parent.toDelta() as Array<{
    insert: string | Y.XmlText
    attributes?: Record<string, string>
  }>

  let index = 0
  for (const entry of delta) {
    if (entry.insert === child) {
      return index
    }
    index++
  }

  return null
}

/**
 * Applies Y.XmlText attribute changes as Slate `set_node` operations.
 */
function applyAttributeChanges(
  editor: PortableTextSlateEditor,
  slatePath: number[],
  yText: Y.XmlText,
  event: Y.YTextEvent,
): void {
  const newProperties: Record<string, unknown> = {}

  for (const key of event.keysChanged) {
    const value = yText.getAttribute(key)
    if (key === 'markDefs') {
      newProperties[key] =
        value !== undefined ? JSON.parse(value as string) : []
    } else if (key === '__inline') {
      newProperties[key] =
        value !== undefined ? JSON.parse(value as string) : undefined
    } else if (key === 'value') {
      newProperties[key] =
        value !== undefined ? JSON.parse(value as string) : undefined
    } else if (key === 'level') {
      newProperties[key] =
        value !== undefined ? JSON.parse(value as string) : undefined
    } else {
      newProperties[key] = value
    }
  }

  const existingNode = Node.has(editor, slatePath)
    ? Node.get(editor, slatePath)
    : undefined

  if (!existingNode) {
    return
  }

  const properties: Record<string, unknown> = {}
  for (const key of Object.keys(newProperties)) {
    if (key in existingNode) {
      properties[key] = (existingNode as Record<string, unknown>)[key]
    }
  }

  editor.apply({
    type: 'set_node',
    path: slatePath,
    properties: properties as Partial<Node>,
    newProperties: newProperties as Partial<Node>,
  })
}

/**
 * Applies Y.XmlText delta changes (insert/delete/retain with attribute changes)
 * as Slate operations.
 */
function applyDeltaChanges(
  editor: PortableTextSlateEditor,
  slatePath: number[],
  _yText: Y.XmlText,
  event: Y.YTextEvent,
): void {
  // The delta describes sequential changes from the perspective of the Y.XmlText
  let offset = 0

  // Get the parent node to understand context
  const parentExists = Node.has(editor, slatePath)
  if (!parentExists) {
    return
  }
  const parentNode = Node.get(editor, slatePath)

  for (const delta of event.delta) {
    if ('retain' in delta) {
      const retainLength = delta.retain as number

      if (delta.attributes) {
        // Attribute changes on retained content → format changes on text
        applyRetainFormatChanges(
          editor,
          slatePath,
          parentNode,
          offset,
          retainLength,
          delta.attributes as Record<string, string>,
        )
      }

      offset += retainLength
    } else if ('delete' in delta) {
      const deleteLength = delta.delete as number
      applyDeltaDelete(editor, slatePath, parentNode, offset, deleteLength)
    } else if ('insert' in delta) {
      const inserts = Array.isArray(delta.insert)
        ? delta.insert
        : [delta.insert]
      const attributes = (delta.attributes ?? {}) as Record<string, string>

      for (const insert of inserts) {
        if (typeof insert === 'string') {
          applyTextInsert(
            editor,
            slatePath,
            parentNode,
            offset,
            insert,
            attributes,
          )
          offset += insert.length
        } else if (insert instanceof Y.XmlText) {
          applyElementInsert(editor, slatePath, parentNode, offset, insert)
          offset += 1
        }
      }
    }
  }
}

/**
 * Applies a text insertion at a given offset within the element at `slatePath`.
 */
function applyTextInsert(
  editor: PortableTextSlateEditor,
  slatePath: number[],
  parentNode: Node,
  offset: number,
  text: string,
  attributes: Record<string, string>,
): void {
  if (!hasChildren(parentNode)) {
    return
  }

  const {childIndex, childOffset} = resolveChildOffset(parentNode, offset)

  const child = parentNode.children[childIndex]

  if (child && Text.isText(child)) {
    // Insert into existing text node
    editor.apply({
      type: 'insert_text',
      path: [...slatePath, childIndex],
      offset: childOffset,
      text,
    })
  } else {
    // Insert a new text node
    const node = deltaInsertToSlateNode({insert: text, attributes})
    editor.apply({
      type: 'insert_node',
      path: [...slatePath, childIndex],
      node,
    })
  }
}

/**
 * Applies an element (Y.XmlText embed) insertion.
 */
function applyElementInsert(
  editor: PortableTextSlateEditor,
  slatePath: number[],
  parentNode: Node,
  offset: number,
  yText: Y.XmlText,
): void {
  if (!hasChildren(parentNode)) {
    return
  }

  const {childIndex} = resolveChildOffset(parentNode, offset)
  const node = yTextToSlateElement(yText) as Descendant

  editor.apply({
    type: 'insert_node',
    path: [...slatePath, childIndex],
    node,
  })
}

/**
 * Applies a deletion at a given offset.
 */
function applyDeltaDelete(
  editor: PortableTextSlateEditor,
  slatePath: number[],
  parentNode: Node,
  offset: number,
  deleteLength: number,
): void {
  if (!hasChildren(parentNode)) {
    return
  }

  let remaining = deleteLength
  let currentOffset = offset

  while (remaining > 0) {
    const {childIndex, childOffset} = resolveChildOffset(
      parentNode,
      currentOffset,
    )
    const child = parentNode.children[childIndex]

    if (!child) {
      break
    }

    if (Text.isText(child)) {
      const textLength = child.text.length - childOffset
      const deleteAmount = Math.min(remaining, textLength)

      if (deleteAmount === child.text.length && childOffset === 0) {
        // Remove the entire text node
        editor.apply({
          type: 'remove_node',
          path: [...slatePath, childIndex],
          node: child,
        })
      } else {
        editor.apply({
          type: 'remove_text',
          path: [...slatePath, childIndex],
          offset: childOffset,
          text: child.text.slice(childOffset, childOffset + deleteAmount),
        })
      }
      remaining -= deleteAmount
      currentOffset += deleteAmount
    } else if (Element.isElement(child)) {
      // Remove the entire element
      editor.apply({
        type: 'remove_node',
        path: [...slatePath, childIndex],
        node: child,
      })
      remaining -= 1
      currentOffset += 1
    } else {
      break
    }
  }
}

/**
 * Applies attribute changes from a `retain` delta entry.
 */
function applyRetainFormatChanges(
  editor: PortableTextSlateEditor,
  slatePath: number[],
  parentNode: Node,
  offset: number,
  _retainLength: number,
  attributes: Record<string, string>,
): void {
  if (!hasChildren(parentNode)) {
    return
  }

  const {childIndex} = resolveChildOffset(parentNode, offset)
  const child = parentNode.children[childIndex]

  if (!child || !Text.isText(child)) {
    return
  }

  const newProperties: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attributes)) {
    newProperties[key] =
      key === 'marks' && value !== null ? JSON.parse(value) : value
  }

  const properties: Record<string, unknown> = {}
  const childRecord = child as unknown as Record<string, unknown>
  for (const key of Object.keys(newProperties)) {
    if (key in childRecord) {
      properties[key] = childRecord[key]
    }
  }

  editor.apply({
    type: 'set_node',
    path: [...slatePath, childIndex],
    properties: properties as Partial<Node>,
    newProperties: newProperties as Partial<Node>,
  })
}

/**
 * Resolves a Y-offset within a Slate element to a child index and
 * offset within that child.
 *
 * Walks through the element's children, accumulating lengths:
 * - Text nodes contribute their text length
 * - Element nodes contribute 1
 */
function resolveChildOffset(
  element: {children: Descendant[]},
  offset: number,
): {childIndex: number; childOffset: number} {
  let remaining = offset
  let index = 0

  for (const child of element.children) {
    if (Text.isText(child)) {
      if (remaining <= child.text.length) {
        return {childIndex: index, childOffset: remaining}
      }
      remaining -= child.text.length
    } else {
      if (remaining === 0) {
        return {childIndex: index, childOffset: 0}
      }
      remaining -= 1
    }
    index++
  }

  return {childIndex: index, childOffset: 0}
}
