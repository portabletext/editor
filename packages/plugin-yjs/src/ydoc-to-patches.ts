import {makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import * as Y from 'yjs'
import type {KeyMap} from './types'

interface DiffMatchPatchResult {
  type: 'diffMatchPatch'
  path: Array<{_key: string} | string>
  value: string
}

interface SetPatchResult {
  type: 'set'
  path: Array<{_key: string} | string>
  value: unknown
}

interface UnsetPatchResult {
  type: 'unset'
  path: Array<{_key: string} | string>
}

interface InsertPatchResult {
  type: 'insert'
  path: Array<{_key: string} | string>
  position: 'before' | 'after'
  items: Array<Record<string, unknown>>
}

type PatchResult =
  | DiffMatchPatchResult
  | SetPatchResult
  | UnsetPatchResult
  | InsertPatchResult

/**
 * Translate Y.Doc observeDeep events into PT patches.
 *
 * Called from the observeDeep handler when remote changes arrive.
 * Produces PT patches that can be fed into the editor via
 * `editor.send({ type: 'patches', patches, snapshot })`.
 *
 * @param events - Y.YEvent array from observeDeep
 * @param keyMap - Bidirectional _key ↔ Y.XmlText lookup
 * @returns Array of PT patches
 *
 * @public
 */
export function ydocToPatches(
  events: Y.YEvent<any>[],
  keyMap: KeyMap,
): PatchResult[] {
  const patches: PatchResult[] = []

  for (const event of events) {
    // Handle events on Y.XmlText (blocks)
    if (event.target instanceof Y.XmlText) {
      const blockKey = keyMap.getKey(event.target)
      if (blockKey) {
        // This is a known block — handle attribute and delta changes
        patches.push(...handleBlockEvent(event, event.target, blockKey, keyMap))
      }
    }

    // Handle events on Y.XmlFragment (root — block insertions/deletions)
    if (event.target instanceof Y.XmlFragment) {
      patches.push(...handleRootEvent(event, keyMap))
    }
  }

  return patches
}

/**
 * Handle events on a block's Y.XmlText.
 * Produces set/unset patches for attribute changes,
 * and diffMatchPatch patches for text edits.
 */
function handleBlockEvent(
  event: Y.YEvent<any>,
  target: Y.XmlText,
  blockKey: string,
  _keyMap: KeyMap,
): PatchResult[] {
  const patches: PatchResult[] = []

  // 1. Attribute changes → set/unset patches
  if (event.keys && event.keys.size > 0) {
    for (const [key, change] of event.keys) {
      if (change.action === 'delete') {
        patches.push({
          type: 'unset',
          path: [{_key: blockKey}, key],
        })
      } else {
        // 'add' or 'update'
        const rawValue = target.getAttribute(key)
        const value = deserializeAttribute(key, rawValue)
        patches.push({
          type: 'set',
          path: [{_key: blockKey}, key],
          value,
        })
      }
    }
  }

  // 2. Delta changes → diffMatchPatch or set patches for span attributes
  if (event.delta && event.delta.length > 0) {
    patches.push(...handleBlockDelta(event, target, blockKey))
  }

  return patches
}

/**
 * Handle delta changes within a block.
 * Text inserts/deletes → diffMatchPatch.
 * Format changes (retain with attributes) → set on span marks.
 */
function handleBlockDelta(
  event: Y.YEvent<any>,
  target: Y.XmlText,
  blockKey: string,
): PatchResult[] {
  const patches: PatchResult[] = []

  // Get the CURRENT delta (after the change) to understand span layout
  const currentDelta = target.toDelta() as Array<{
    insert: string | Y.XmlText
    attributes?: Record<string, string>
  }>

  // Build span info from current delta
  const spans: Array<{
    key: string
    text: string
    start: number
    length: number
  }> = []
  let offset = 0
  for (const entry of currentDelta) {
    if (typeof entry.insert === 'string') {
      const spanKey = entry.attributes?.['_key']
      if (spanKey) {
        spans.push({
          key: spanKey,
          text: entry.insert,
          start: offset,
          length: entry.insert.length,
        })
      }
      offset += entry.insert.length
    } else {
      // Inline element — skip for now
      offset += 1
    }
  }

  // Walk the event delta to determine what changed
  const delta = event.delta as Array<
    | {retain: number; attributes?: Record<string, string>}
    | {insert: string | Y.XmlText; attributes?: Record<string, string>}
    | {delete: number}
  >

  // Track affected spans: we need to reconstruct old text to generate DMP
  // Strategy: walk the delta and for each insert/delete, find the affected span
  // and compute what the old text was
  let currentPos = 0

  for (const op of delta) {
    if ('retain' in op) {
      // Check for format changes (retain with attributes = span mark change)
      if (op.attributes) {
        const span = findSpanAtOffset(spans, currentPos)
        if (span && op.attributes['marks'] !== undefined) {
          const marksValue = deserializeAttribute(
            'marks',
            op.attributes['marks'],
          )
          patches.push({
            type: 'set',
            path: [{_key: blockKey}, 'children', {_key: span.key}, 'marks'],
            value: marksValue,
          })
        }
      }
      currentPos += op.retain
    } else if ('insert' in op) {
      if (typeof op.insert === 'string') {
        // Text was inserted — find which span it belongs to
        const spanKey = op.attributes?.['_key']
        if (spanKey) {
          const span = spans.find((s) => s.key === spanKey)
          if (span) {
            // Compute old text: current text minus the inserted portion
            const insertOffsetInSpan = currentPos - span.start
            const oldText =
              span.text.slice(0, insertOffsetInSpan) +
              span.text.slice(insertOffsetInSpan + op.insert.length)

            const dmpPatches = makePatches(oldText, span.text)
            const dmpString = stringifyPatches(dmpPatches)

            patches.push({
              type: 'diffMatchPatch',
              path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
              value: dmpString,
            })
          }
        }
        currentPos += op.insert.length
      } else {
        // Y.XmlText inserted — inline element, skip for now
        currentPos += 1
      }
    } else if ('delete' in op) {
      // Text was deleted — find which span was affected
      // The deleted text is at currentPos in the OLD document
      // We need to find which span contained that position BEFORE the delete
      // Since the current delta is AFTER the delete, we need to account for
      // the fact that the span's text is now shorter
      const span = findSpanAtOffset(spans, currentPos)
      if (span) {
        // The span's current text is the text AFTER deletion
        // Old text = current text with the deleted chars re-inserted at currentPos
        // But we don't know what was deleted... we can reconstruct from the event
        const deletedContent = getDeletedTextFromEvent(event, currentPos)
        const insertOffsetInSpan = currentPos - span.start
        const oldText =
          span.text.slice(0, insertOffsetInSpan) +
          deletedContent +
          span.text.slice(insertOffsetInSpan)

        const dmpPatches = makePatches(oldText, span.text)
        const dmpString = stringifyPatches(dmpPatches)

        patches.push({
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: span.key}, 'text'],
          value: dmpString,
        })
      }
      // Don't advance currentPos — deleted content is gone
    }
  }

  return patches
}

/**
 * Handle events on the root Y.XmlFragment.
 * Block insertions → insert patches.
 * Block deletions → unset patches.
 */
function handleRootEvent(event: Y.YEvent<any>, keyMap: KeyMap): PatchResult[] {
  const patches: PatchResult[] = []
  const root = event.target as Y.XmlFragment

  const delta = event.delta as Array<
    {retain: number} | {insert: Array<Y.XmlText>} | {delete: number}
  >

  let blockIndex = 0

  for (const op of delta) {
    if ('retain' in op) {
      blockIndex += op.retain
    } else if ('insert' in op) {
      if (Array.isArray(op.insert)) {
        for (const yText of op.insert) {
          if (yText instanceof Y.XmlText) {
            const newBlockKey = yText.getAttribute('_key') as string | undefined
            if (newBlockKey) {
              // Register in keyMap
              keyMap.set(newBlockKey, yText)

              // Build the block value
              const blockValue = yTextToBlock(yText)

              // Find the previous block for relative positioning
              const patch: InsertPatchResult = {
                type: 'insert',
                path: [{_key: newBlockKey}],
                position: 'before',
                items: [blockValue],
              }

              if (blockIndex > 0) {
                // Find the block before this position
                const prevBlock = root.get(blockIndex - 1)
                if (prevBlock instanceof Y.XmlText) {
                  const prevKey = prevBlock.getAttribute('_key')
                  if (prevKey) {
                    patch.path = [{_key: prevKey}]
                    patch.position = 'after'
                  }
                }
              }

              patches.push(patch)
            }
          }
          blockIndex++
        }
      }
    } else if ('delete' in op) {
      // Find deleted blocks from event changes
      for (const item of event.changes.deleted) {
        if (item.content.constructor.name === 'ContentType') {
          const deletedType = (item.content as any).type
          if (deletedType instanceof Y.XmlText) {
            const deletedKey = keyMap.getKey(deletedType)
            if (deletedKey) {
              patches.push({
                type: 'unset',
                path: [{_key: deletedKey}],
              })
              keyMap.delete(deletedKey)
            }
          }
        }
      }
      blockIndex += op.delete
    }
  }

  return patches
}

/**
 * Find which span contains the given character offset.
 */
function findSpanAtOffset(
  spans: Array<{key: string; text: string; start: number; length: number}>,
  offset: number,
): {key: string; text: string; start: number; length: number} | undefined {
  for (const span of spans) {
    if (offset >= span.start && offset < span.start + span.length) {
      return span
    }
  }
  // If offset is at the end of the last span, return the last span
  if (spans.length > 0) {
    const last = spans[spans.length - 1]!
    if (offset === last.start + last.length) {
      return last
    }
  }
  return undefined
}

/**
 * Try to extract deleted text content from a Y.YTextEvent.
 */
function getDeletedTextFromEvent(
  event: Y.YEvent<any>,
  _offset: number,
): string {
  // Walk the deleted items to reconstruct the deleted text
  let deletedText = ''
  for (const item of event.changes.deleted) {
    if (item.content.constructor.name === 'ContentString') {
      deletedText += (item.content as any).str
    }
  }
  return deletedText
}

/**
 * Deserialize a Y.XmlText attribute value.
 * Some attributes are stored as JSON strings (markDefs, marks, level).
 */
function deserializeAttribute(key: string, value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

  // Known JSON-encoded attributes
  if (key === 'markDefs' || key === 'marks') {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  // level is stored as string but should be a number
  if (key === 'level') {
    const num = Number(value)
    if (!Number.isNaN(num)) {
      return num
    }
  }

  return value
}

/**
 * Convert a Y.XmlText block to a PT block object.
 */
function yTextToBlock(yText: Y.XmlText): Record<string, unknown> {
  const block: Record<string, unknown> = {}

  const attrs = yText.getAttributes()
  for (const [key, value] of Object.entries(attrs)) {
    block[key] = deserializeAttribute(key, value)
  }

  const delta = yText.toDelta() as Array<{
    insert: string | Y.XmlText
    attributes?: Record<string, string>
  }>

  const children: Array<Record<string, unknown>> = []
  for (const entry of delta) {
    if (typeof entry.insert === 'string') {
      const child: Record<string, unknown> = {text: entry.insert}
      if (entry.attributes) {
        for (const [key, value] of Object.entries(entry.attributes)) {
          child[key] = deserializeAttribute(key, value)
        }
      }
      children.push(child)
    }
  }

  block['children'] = children.length > 0 ? children : [{text: ''}]
  return block
}
