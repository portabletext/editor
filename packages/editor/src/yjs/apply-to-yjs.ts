import * as Y from 'yjs'
import {Element, Text, type Node, type Operation} from '../slate'
import {slateNodesToInsertDelta} from './convert'
import {getYTarget} from './utils'

/**
 * Translates a single Slate operation into the equivalent Yjs mutation
 * on the shared Y.XmlText root.
 *
 * This is called for each local Slate operation so that the Y.Doc
 * stays in sync with the local Slate document.
 */
export function applySlateOp(
  sharedRoot: Y.XmlText,
  slateDoc: Node,
  op: Operation,
): void {
  switch (op.type) {
    case 'insert_text': {
      return applyInsertText(sharedRoot, slateDoc, op)
    }
    case 'remove_text': {
      return applyRemoveText(sharedRoot, slateDoc, op)
    }
    case 'insert_node': {
      return applyInsertNode(sharedRoot, slateDoc, op)
    }
    case 'remove_node': {
      return applyRemoveNode(sharedRoot, slateDoc, op)
    }
    case 'set_node': {
      return applySetNode(sharedRoot, slateDoc, op)
    }
    case 'split_node': {
      return applySplitNode(sharedRoot, slateDoc, op)
    }
    case 'merge_node': {
      return applyMergeNode(sharedRoot, slateDoc, op)
    }
    case 'move_node': {
      return applyMoveNode(sharedRoot, slateDoc, op)
    }
    case 'set_selection': {
      // No-op: selections are local
      return
    }
  }
}

function applyInsertText(
  sharedRoot: Y.XmlText,
  slateDoc: Node,
  op: Extract<Operation, {type: 'insert_text'}>,
): void {
  const {path, offset, text} = op
  const target = getYTarget(sharedRoot, slateDoc, path)

  // Get existing attributes at this position to preserve _key and marks
  const delta = target.yParent.toDelta() as Array<{
    insert: string | Y.XmlText
    attributes?: Record<string, string>
  }>

  const attributes = getAttributesAtOffset(
    delta,
    target.textRange.start + offset,
  )
  target.yParent.insert(target.textRange.start + offset, text, attributes)
}

function applyRemoveText(
  sharedRoot: Y.XmlText,
  slateDoc: Node,
  op: Extract<Operation, {type: 'remove_text'}>,
): void {
  const {path, offset, text} = op
  const target = getYTarget(sharedRoot, slateDoc, path)
  target.yParent.delete(target.textRange.start + offset, text.length)
}

function applyInsertNode(
  sharedRoot: Y.XmlText,
  slateDoc: Node,
  op: Extract<Operation, {type: 'insert_node'}>,
): void {
  const {path, node} = op

  // Get parent path and child index
  const parentPath = path.slice(0, -1)
  const index = path[path.length - 1]
  if (index === undefined) {
    return
  }

  const parentTarget = getYTarget(sharedRoot, slateDoc, parentPath)
  const parent = parentTarget.yTarget ?? parentTarget.yParent

  // Calculate the offset for the new child
  const offset = getInsertOffset(parent, slateDoc, parentPath, index)

  if (Text.isText(node)) {
    const attributes: Record<string, string> = {}
    const {text, ...rest} = node
    for (const [key, value] of Object.entries(rest)) {
      attributes[key] =
        typeof value === 'string' ? value : JSON.stringify(value)
    }
    parent.insert(offset, text, attributes)
  } else if (Element.isElement(node)) {
    // Embed an empty Y.XmlText first so it's attached to the Y.Doc,
    // then populate it with attributes and children. Operations on a
    // standalone (unattached) Y.XmlText don't survive CRDT integration.
    const yText = new Y.XmlText()
    parent.insertEmbed(offset, yText)

    const {children, ...props} = node
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined) {
        continue
      }
      if (key === 'markDefs' || typeof value !== 'string') {
        yText.setAttribute(key, JSON.stringify(value))
      } else {
        yText.setAttribute(key, value)
      }
    }

    const delta = slateNodesToInsertDelta(children)
    if (delta.length > 0) {
      yText.applyDelta(delta)
    }
  }
}

function applyRemoveNode(
  sharedRoot: Y.XmlText,
  slateDoc: Node,
  op: Extract<Operation, {type: 'remove_node'}>,
): void {
  const {path} = op
  const target = getYTarget(sharedRoot, slateDoc, path)
  const length = target.textRange.end - target.textRange.start
  target.yParent.delete(target.textRange.start, length)
}

function applySetNode(
  sharedRoot: Y.XmlText,
  slateDoc: Node,
  op: Extract<Operation, {type: 'set_node'}>,
): void {
  const {path, newProperties} = op
  const target = getYTarget(sharedRoot, slateDoc, path)

  if (target.yTarget) {
    // Element node: set attributes on the Y.XmlText
    for (const [key, value] of Object.entries(newProperties)) {
      if (key === 'children') {
        continue
      }
      if (value === undefined) {
        target.yTarget.removeAttribute(key)
      } else if (key === 'markDefs') {
        target.yTarget.setAttribute(key, JSON.stringify(value))
      } else if (typeof value === 'string') {
        target.yTarget.setAttribute(key, value)
      } else {
        target.yTarget.setAttribute(key, JSON.stringify(value))
      }
    }
  } else {
    // Text node: format the text range with new attributes
    const attributes: Record<string, string> = {}
    for (const [key, value] of Object.entries(newProperties)) {
      if (key === 'text') {
        continue
      }
      attributes[key] =
        typeof value === 'string' ? value : JSON.stringify(value)
    }
    const length = target.textRange.end - target.textRange.start
    if (length > 0) {
      target.yParent.format(target.textRange.start, length, attributes)
    }
  }
}

function applySplitNode(
  sharedRoot: Y.XmlText,
  slateDoc: Node,
  op: Extract<Operation, {type: 'split_node'}>,
): void {
  const {path, position, properties} = op
  const target = getYTarget(sharedRoot, slateDoc, path)

  if (target.yTarget) {
    // Splitting an element node: create a new Y.XmlText with the trailing content
    const yTarget = target.yTarget
    const delta = yTarget.toDelta() as Array<{
      insert: string | Y.XmlText
      attributes?: Record<string, string>
    }>

    // Find split point in the delta
    const {trailingDelta, deleteLength} = splitDeltaAtPosition(delta, position)

    // Delete trailing content from original first
    if (deleteLength > 0) {
      const totalLength = yTextContentLengthFromDelta(delta)
      yTarget.delete(position, totalLength - position)
    }

    // Embed an empty Y.XmlText first so it's attached to the Y.Doc,
    // then populate it. Operations on standalone Y.XmlText don't survive
    // CRDT integration.
    const parentTarget = getYTarget(sharedRoot, slateDoc, path.slice(0, -1))
    const parent = parentTarget.yTarget ?? parentTarget.yParent
    const newYText = new Y.XmlText()
    parent.insertEmbed(target.textRange.end, newYText)

    // Copy attributes from the original, then override with split properties
    const originalAttrs = yTarget.getAttributes()
    for (const [key, value] of Object.entries(originalAttrs)) {
      newYText.setAttribute(key, value as string)
    }
    for (const [key, value] of Object.entries(properties)) {
      if (key === 'children') {
        continue
      }
      if (value === undefined) {
        newYText.removeAttribute(key)
      } else if (key === 'markDefs') {
        newYText.setAttribute(key, JSON.stringify(value))
      } else if (typeof value === 'string') {
        newYText.setAttribute(key, value)
      } else {
        newYText.setAttribute(key, JSON.stringify(value))
      }
    }

    // Apply trailing content to the now-attached Y.XmlText
    if (trailingDelta.length > 0) {
      newYText.applyDelta(trailingDelta)
    }
  } else {
    // Splitting a text node: split the text at position
    const parentPath = path.slice(0, -1)
    const parentTarget = getYTarget(sharedRoot, slateDoc, parentPath)
    const parent = parentTarget.yTarget ?? parentTarget.yParent

    const textStart = target.textRange.start
    const splitOffset = textStart + position

    // Get the content after split point
    const delta = parent.toDelta() as Array<{
      insert: string | Y.XmlText
      attributes?: Record<string, string>
    }>

    const trailingText = getTextAtRange(
      delta,
      splitOffset,
      target.textRange.end,
    )

    // Build attributes for the new text span
    const newAttributes: Record<string, string> = {}
    for (const [key, value] of Object.entries(properties)) {
      if (key === 'text') {
        continue
      }
      newAttributes[key] =
        typeof value === 'string' ? value : JSON.stringify(value)
    }

    // Delete the trailing text from its current position
    if (target.textRange.end - splitOffset > 0) {
      parent.delete(splitOffset, target.textRange.end - splitOffset)
    }

    // Insert the trailing text as a new span right after split point
    if (trailingText.length > 0) {
      parent.insert(splitOffset, trailingText, newAttributes)
    }
  }
}

function applyMergeNode(
  sharedRoot: Y.XmlText,
  slateDoc: Node,
  op: Extract<Operation, {type: 'merge_node'}>,
): void {
  const {path, position} = op
  const target = getYTarget(sharedRoot, slateDoc, path)

  // The node at `path` merges into the node at `path - 1`
  const lastIndex = path[path.length - 1]
  if (lastIndex === undefined) {
    return
  }
  const previousPath = [...path.slice(0, -1), lastIndex - 1]

  if (target.yTarget) {
    // Merging element nodes: copy all content from target into previous,
    // then delete the target
    const previousTarget = getYTarget(sharedRoot, slateDoc, previousPath)
    const previousYText = previousTarget.yTarget

    if (!previousYText) {
      throw new Error(
        'Expected previous target to be a Y.XmlText for element merge',
      )
    }

    const delta = target.yTarget.toDelta() as Array<{
      insert: string | Y.XmlText
      attributes?: Record<string, string>
    }>

    // Insert content from source at the end of target (at `position`)
    if (delta.length > 0) {
      previousYText.applyDelta([{retain: position}, ...delta])
    }

    // Remove the source element from the parent
    const parentTarget = getYTarget(sharedRoot, slateDoc, path.slice(0, -1))
    const parent = parentTarget.yTarget ?? parentTarget.yParent
    parent.delete(target.textRange.start, 1)
  } else {
    // Merging text nodes: in Yjs's flat text model, the text content
    // stays in place. We re-format the merged span's text to have the
    // same attributes as the preceding span, so Yjs merges them.
    const length = target.textRange.end - target.textRange.start
    if (length > 0) {
      // Get the attributes of the preceding text span
      const previousTarget = getYTarget(sharedRoot, slateDoc, previousPath)
      const delta = target.yParent.toDelta() as Array<{
        insert: string | Y.XmlText
        attributes?: Record<string, string>
      }>
      const prevAttributes = getAttributesAtOffset(
        delta,
        previousTarget.textRange.start,
      )
      target.yParent.format(target.textRange.start, length, prevAttributes)
    } else {
      // Empty text span — just delete it since there's no content to preserve
      // The span contributes no characters to the Yjs text, but check for
      // zero-length formatted ranges that may need cleanup
    }
  }
}

function applyMoveNode(
  sharedRoot: Y.XmlText,
  slateDoc: Node,
  op: Extract<Operation, {type: 'move_node'}>,
): void {
  const {path, newPath} = op

  // Read the node content first
  const target = getYTarget(sharedRoot, slateDoc, path)

  if (target.yTarget) {
    // Moving an element: clone it, remove from old position, insert at new
    const delta = target.yTarget.toDelta() as Array<{
      insert: string | Y.XmlText
      attributes?: Record<string, string>
    }>
    const attributes = target.yTarget.getAttributes()

    // Remove from old position
    target.yParent.delete(target.textRange.start, 1)

    // Insert at new position
    const newParentPath = newPath.slice(0, -1)
    const newIndex = newPath[newPath.length - 1]
    if (newIndex === undefined) {
      return
    }
    const newParentTarget = getYTarget(sharedRoot, slateDoc, newParentPath)
    const newParent = newParentTarget.yTarget ?? newParentTarget.yParent

    const newOffset = getInsertOffset(
      newParent,
      slateDoc,
      newParentPath,
      newIndex,
    )

    // Embed an empty Y.XmlText first so it's attached to the Y.Doc,
    // then populate it. Operations on standalone Y.XmlText don't survive
    // CRDT integration.
    const newYText = new Y.XmlText()
    newParent.insertEmbed(newOffset, newYText)

    for (const [key, value] of Object.entries(attributes)) {
      newYText.setAttribute(key, value as string)
    }
    if (delta.length > 0) {
      newYText.applyDelta(delta)
    }
  }
}

function getInsertOffset(
  parent: Y.XmlText,
  _slateDoc: Node,
  _parentPath: number[],
  index: number,
): number {
  const delta = parent.toDelta() as Array<{
    insert: string | Y.XmlText
  }>

  let offset = 0
  let childIndex = 0

  for (const entry of delta) {
    if (childIndex >= index) {
      break
    }

    if (typeof entry.insert === 'string') {
      // Text entries might span multiple Slate text nodes if they have the
      // same attributes. For our mapping, each distinct text span in the
      // delta corresponds to one Slate text child.
      offset += entry.insert.length
      childIndex++
    } else {
      // Embedded Y.XmlText = 1 Slate element child
      offset += 1
      childIndex++
    }
  }

  return offset
}

function getAttributesAtOffset(
  delta: Array<{
    insert: string | Y.XmlText
    attributes?: Record<string, string>
  }>,
  offset: number,
): Record<string, string> {
  let currentOffset = 0
  for (const entry of delta) {
    const length = typeof entry.insert === 'string' ? entry.insert.length : 1

    if (currentOffset + length > offset) {
      return entry.attributes ? {...entry.attributes} : {}
    }
    currentOffset += length
  }
  return {}
}

function splitDeltaAtPosition(
  delta: Array<{
    insert: string | Y.XmlText
    attributes?: Record<string, string>
  }>,
  position: number,
): {trailingDelta: typeof delta; deleteLength: number} {
  const trailingDelta: typeof delta = []
  let currentOffset = 0
  let deleteLength = 0

  for (const entry of delta) {
    const length = typeof entry.insert === 'string' ? entry.insert.length : 1

    if (currentOffset >= position) {
      // Entirely after split point
      trailingDelta.push(entry)
      deleteLength += length
    } else if (currentOffset + length > position) {
      // Straddles the split point (text only)
      if (typeof entry.insert === 'string') {
        const splitAt = position - currentOffset
        const trailing = entry.insert.slice(splitAt)
        if (trailing.length > 0) {
          trailingDelta.push({insert: trailing, attributes: entry.attributes})
          deleteLength += trailing.length
        }
      }
    }

    currentOffset += length
  }

  return {trailingDelta, deleteLength}
}

function yTextContentLengthFromDelta(
  delta: Array<{insert: string | Y.XmlText}>,
): number {
  let length = 0
  for (const entry of delta) {
    length += typeof entry.insert === 'string' ? entry.insert.length : 1
  }
  return length
}

function getTextAtRange(
  delta: Array<{
    insert: string | Y.XmlText
    attributes?: Record<string, string>
  }>,
  start: number,
  end: number,
): string {
  let result = ''
  let currentOffset = 0

  for (const entry of delta) {
    if (typeof entry.insert !== 'string') {
      currentOffset += 1
      continue
    }

    const entryStart = currentOffset
    const entryEnd = currentOffset + entry.insert.length

    if (entryEnd <= start) {
      currentOffset = entryEnd
      continue
    }
    if (entryStart >= end) {
      break
    }

    const sliceStart = Math.max(0, start - entryStart)
    const sliceEnd = Math.min(entry.insert.length, end - entryStart)
    result += entry.insert.slice(sliceStart, sliceEnd)
    currentOffset = entryEnd
  }

  return result
}
