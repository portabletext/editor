import type {
  DiffMatchPatch,
  InsertPatch,
  Patch,
  SetIfMissingPatch,
  SetPatch,
  UnsetPatch,
} from '@portabletext/patches'
import {
  DIFF_DELETE,
  DIFF_EQUAL,
  DIFF_INSERT,
  applyPatches as dmpApplyPatches,
  makeDiff,
  parsePatch,
} from '@sanity/diff-match-patch'
import * as Y from 'yjs'
import type {KeyMap} from './types'

/**
 * Convert a PT block to a Y.XmlText and register it in the KeyMap.
 *
 * Block structure in Y.Doc:
 * - Y.XmlText with attributes: _key, _type, style, listItem, level, etc.
 * - Delta content: spans as text inserts with attributes (_key, _type, marks)
 * - markDefs stored as a JSON string attribute on the block
 *
 * @public
 */
export function blockToYText(
  // biome-ignore lint/complexity/noBannedTypes: PT blocks are generic records
  block: Record<string, unknown>,
  keyMap: KeyMap,
): Y.XmlText {
  const yBlock = new Y.XmlText()
  const blockKey = block['_key'] as string | undefined

  // Set block-level attributes
  for (const [key, value] of Object.entries(block)) {
    if (key === 'children' || key === 'markDefs') {
      continue
    }
    yBlock.setAttribute(key, value)
  }

  // Store markDefs as JSON attribute
  if (Array.isArray(block['markDefs'])) {
    yBlock.setAttribute('markDefs', JSON.stringify(block['markDefs']))
  }

  // Insert children as delta entries
  const children = block['children'] as
    | Array<Record<string, unknown>>
    | undefined
  if (Array.isArray(children)) {
    let offset = 0
    for (const child of children) {
      const text = (child['text'] as string) ?? ''
      const attrs: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(child)) {
        if (key === 'text') {
          continue
        }
        if (key === 'marks' && Array.isArray(value)) {
          attrs[key] = JSON.stringify(value)
        } else {
          attrs[key] = value
        }
      }
      yBlock.insert(offset, text, attrs)
      offset += text.length
    }
  }

  if (blockKey) {
    keyMap.set(blockKey, yBlock)
  }

  return yBlock
}

/**
 * Resolve a block key from a patch path.
 */
function resolveBlockKey(path: unknown[]): string | undefined {
  const first = path[0]
  if (typeof first === 'object' && first !== null && '_key' in first) {
    return (first as {_key: string})._key
  }
  return undefined
}

/**
 * Resolve a child (span) key from a patch path.
 */
function resolveChildKey(path: unknown[]): string | undefined {
  if (path.length >= 3 && path[1] === 'children') {
    const third = path[2]
    if (typeof third === 'object' && third !== null && '_key' in third) {
      return (third as {_key: string})._key
    }
  }
  return undefined
}

/**
 * Find the offset range of a span within a block's Y.XmlText delta.
 * Returns [startOffset, endOffset] or undefined if not found.
 */
function findSpanOffset(
  yBlock: Y.XmlText,
  spanKey: string,
): [number, number] | undefined {
  const delta = yBlock.toDelta() as Array<{
    insert: string
    attributes?: Record<string, unknown>
  }>
  let offset = 0
  for (const entry of delta) {
    const text = typeof entry.insert === 'string' ? entry.insert : ''
    if (entry.attributes?.['_key'] === spanKey) {
      return [offset, offset + text.length]
    }
    offset += text.length
  }
  return undefined
}

/**
 * Get the span attributes at a given offset in a block's delta.
 */
function getSpanAttrsAtOffset(
  yBlock: Y.XmlText,
  targetOffset: number,
): Record<string, unknown> {
  const delta = yBlock.toDelta() as Array<{
    insert: string
    attributes?: Record<string, unknown>
  }>
  let offset = 0
  for (const entry of delta) {
    const text = typeof entry.insert === 'string' ? entry.insert : ''
    if (offset + text.length > targetOffset || text.length === 0) {
      return entry.attributes ?? {}
    }
    offset += text.length
  }
  return {}
}

/**
 * Find the index of a block in the root XmlFragment.
 */
function findBlockIndexInFragment(
  root: Y.XmlFragment,
  blockKey: string,
): number {
  for (let i = 0; i < root.length; i++) {
    const child = root.get(i)
    if (child instanceof Y.XmlText && child.getAttribute('_key') === blockKey) {
      return i
    }
  }
  return -1
}

/**
 * Apply a PT patch to the Y.Doc.
 *
 * @public
 */
export function applyPatchToYDoc(
  patch: Patch,
  root: Y.XmlFragment,
  keyMap: KeyMap,
): void {
  switch (patch.type) {
    case 'diffMatchPatch':
      applyDiffMatchPatch(patch, keyMap)
      break
    case 'set':
      applySetPatch(patch, keyMap)
      break
    case 'unset':
      applyUnsetPatch(patch, root, keyMap)
      break
    case 'insert':
      applyInsertPatch(patch, root, keyMap)
      break
    case 'setIfMissing':
      applySetIfMissingPatch(patch, keyMap)
      break
  }
}

function applyDiffMatchPatch(patch: DiffMatchPatch, keyMap: KeyMap): void {
  const blockKey = resolveBlockKey(patch.path)
  const spanKey = resolveChildKey(patch.path)
  if (!blockKey || !spanKey) {
    return
  }

  const yBlock = keyMap.getYText(blockKey)
  if (!yBlock) {
    return
  }

  // Get current text for this span
  const spanRange = findSpanOffset(yBlock, spanKey)

  if (!spanRange) {
    // Span not in delta (empty span was optimized away by Yjs).
    // Apply the DMP patch against empty string and insert the result.
    const patches = parsePatch(patch.value)
    const [newText] = dmpApplyPatches(patches, '', {
      allowExceedingIndices: true,
    })
    if (newText) {
      // Insert at end of block with span attributes
      const blockLength = yBlock
        .toDelta()
        .reduce(
          (len: number, entry: {insert: string | Y.XmlText}) =>
            len + (typeof entry.insert === 'string' ? entry.insert.length : 1),
          0,
        )
      yBlock.insert(blockLength, newText, {
        _key: spanKey,
        _type: 'span',
        marks: '[]',
      })
    }
    return
  }

  // Get text from delta (toString returns XML, not plain text)
  const currentDelta = yBlock.toDelta() as Array<{
    insert: string
    attributes?: Record<string, unknown>
  }>
  let fullText = ''
  for (const entry of currentDelta) {
    if (typeof entry.insert === 'string') {
      fullText += entry.insert
    }
  }
  const currentText = fullText.slice(spanRange[0], spanRange[1])

  // Read span attributes BEFORE modifying the Y.XmlText
  const spanAttrs = getSpanAttrsAtOffset(yBlock, spanRange[0])

  // Apply DMP patch to get new text
  const patches = parsePatch(patch.value)
  const [newText] = dmpApplyPatches(patches, currentText, {
    allowExceedingIndices: true,
  })

  // Compute character-level diff and apply to Y.XmlText
  const diffs = makeDiff(currentText, newText)
  let offset = spanRange[0]
  for (const [op, text] of diffs) {
    if (op === DIFF_INSERT) {
      yBlock.insert(offset, text, spanAttrs)
      offset += text.length
    } else if (op === DIFF_DELETE) {
      yBlock.delete(offset, text.length)
    } else if (op === DIFF_EQUAL) {
      offset += text.length
    }
  }
}

function applySetPatch(patch: SetPatch, keyMap: KeyMap): void {
  const blockKey = resolveBlockKey(patch.path)
  if (!blockKey) {
    return
  }

  const yBlock = keyMap.getYText(blockKey)
  if (!yBlock) {
    return
  }

  if (patch.path.length === 1) {
    // Full block replacement
    const value = patch.value as Record<string, unknown>
    if (typeof value !== 'object' || value === null) {
      return
    }

    for (const [key, val] of Object.entries(value)) {
      if (key === 'children' || key === 'markDefs') {
        continue
      }
      yBlock.setAttribute(key, val)
    }

    if (Array.isArray(value['markDefs'])) {
      yBlock.setAttribute('markDefs', JSON.stringify(value['markDefs']))
    }

    if (Array.isArray(value['children'])) {
      const currentLength = yBlock.toString().length
      if (currentLength > 0) {
        yBlock.delete(0, currentLength)
      }
      let offset = 0
      for (const child of value['children'] as Array<Record<string, unknown>>) {
        const text = (child['text'] as string) ?? ''
        const attrs: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(child)) {
          if (k === 'text') {
            continue
          }
          if (k === 'marks' && Array.isArray(v)) {
            attrs[k] = JSON.stringify(v)
          } else {
            attrs[k] = v
          }
        }
        yBlock.insert(offset, text, attrs)
        offset += text.length
      }
    }
    return
  }

  if (patch.path.length === 2) {
    // Block property
    const prop = patch.path[1]
    if (typeof prop === 'string') {
      if (prop === 'markDefs' && Array.isArray(patch.value)) {
        yBlock.setAttribute(prop, JSON.stringify(patch.value))
      } else {
        yBlock.setAttribute(prop, patch.value)
      }
    }
    return
  }

  // Span property
  const spanKey = resolveChildKey(patch.path)
  if (!spanKey) {
    return
  }

  const spanRange = findSpanOffset(yBlock, spanKey)
  if (!spanRange) {
    return
  }

  if (patch.path.length === 4) {
    const prop = patch.path[3]
    if (typeof prop === 'string') {
      if (prop === 'text' && typeof patch.value === 'string') {
        const currentLength = spanRange[1] - spanRange[0]
        if (currentLength > 0) {
          yBlock.delete(spanRange[0], currentLength)
        }
        const attrs = getSpanAttrsAtOffset(yBlock, spanRange[0])
        yBlock.insert(spanRange[0], patch.value, attrs)
      } else if (prop === 'marks') {
        const value = Array.isArray(patch.value)
          ? JSON.stringify(patch.value)
          : patch.value
        yBlock.format(spanRange[0], spanRange[1] - spanRange[0], {
          [prop]: value,
        })
      } else {
        yBlock.format(spanRange[0], spanRange[1] - spanRange[0], {
          [prop]: patch.value,
        })
      }
    }
  }
}

function applyUnsetPatch(
  patch: UnsetPatch,
  root: Y.XmlFragment,
  keyMap: KeyMap,
): void {
  const blockKey = resolveBlockKey(patch.path)
  if (!blockKey) {
    return
  }

  if (patch.path.length === 1) {
    // Remove block
    const index = findBlockIndexInFragment(root, blockKey)
    if (index !== -1) {
      root.delete(index, 1)
    }
    keyMap.delete(blockKey)
    return
  }

  const yBlock = keyMap.getYText(blockKey)
  if (!yBlock) {
    return
  }

  if (patch.path.length === 2) {
    const prop = patch.path[1]
    if (typeof prop === 'string') {
      yBlock.removeAttribute(prop)
    }
    return
  }

  // Remove span
  const spanKey = resolveChildKey(patch.path)
  if (!spanKey) {
    return
  }

  if (patch.path.length === 3) {
    const spanRange = findSpanOffset(yBlock, spanKey)
    if (spanRange) {
      yBlock.delete(spanRange[0], spanRange[1] - spanRange[0])
    }
    return
  }

  if (patch.path.length === 4) {
    const spanRange = findSpanOffset(yBlock, spanKey)
    if (!spanRange) {
      return
    }
    const prop = patch.path[3]
    if (typeof prop === 'string') {
      yBlock.format(spanRange[0], spanRange[1] - spanRange[0], {
        [prop]: null,
      })
    }
  }
}

function applyInsertPatch(
  patch: InsertPatch,
  root: Y.XmlFragment,
  keyMap: KeyMap,
): void {
  const blockKey = resolveBlockKey(patch.path)

  if (patch.path.length === 1 && blockKey) {
    // Insert blocks before/after a reference block
    const refIndex = findBlockIndexInFragment(root, blockKey)
    if (refIndex === -1) {
      return
    }

    const insertIndex = patch.position === 'after' ? refIndex + 1 : refIndex

    for (let i = 0; i < patch.items.length; i++) {
      const block = patch.items[i] as Record<string, unknown>
      const yBlock = blockToYText(block, keyMap)
      root.insert(insertIndex + i, [yBlock])
    }
    return
  }

  // Insert spans into a block
  if (patch.path.length >= 3 && blockKey) {
    const yBlock = keyMap.getYText(blockKey)
    if (!yBlock) {
      return
    }

    const spanKey = resolveChildKey(patch.path)
    let insertOffset: number

    if (spanKey) {
      const spanRange = findSpanOffset(yBlock, spanKey)
      if (!spanRange) {
        return
      }
      insertOffset = patch.position === 'after' ? spanRange[1] : spanRange[0]
    } else {
      insertOffset = yBlock.toString().length
    }

    for (const item of patch.items) {
      const child = item as Record<string, unknown>
      const text = (child['text'] as string) ?? ''
      const attrs: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(child)) {
        if (key === 'text') {
          continue
        }
        if (key === 'marks' && Array.isArray(value)) {
          attrs[key] = JSON.stringify(value)
        } else {
          attrs[key] = value
        }
      }
      yBlock.insert(insertOffset, text, attrs)
      insertOffset += text.length
    }
  }
}

function applySetIfMissingPatch(
  patch: SetIfMissingPatch,
  keyMap: KeyMap,
): void {
  const blockKey = resolveBlockKey(patch.path)
  if (!blockKey) {
    return
  }

  const yBlock = keyMap.getYText(blockKey)
  if (!yBlock) {
    return
  }

  if (patch.path.length === 2) {
    const prop = patch.path[1]
    if (typeof prop === 'string') {
      const existing = yBlock.getAttribute(prop)
      if (existing === undefined) {
        if (prop === 'markDefs' && Array.isArray(patch.value)) {
          yBlock.setAttribute(prop, JSON.stringify(patch.value))
        } else {
          yBlock.setAttribute(prop, patch.value)
        }
      }
    }
  }
}
