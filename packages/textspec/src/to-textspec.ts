import {isSpan, isTextBlock} from '@portabletext/schema'
import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextTextBlock,
  Schema,
} from '@portabletext/schema'
import {serialize} from '@textspec/notation'
import type {
  Block,
  ContainerBlock,
  EditorState,
  InlineNode,
  TextBlock,
  Selection as TextspecSelection,
} from '@textspec/notation'

/**
 * Selection types that are structurally compatible with PTE's EditorSelection.
 * Defined locally to avoid depending on @portabletext/editor (which requires React).
 * The path type is intentionally wide to accept EditorSelectionPoint.path
 * which includes KeyedSegment, IndexTuple, string, and number.
 */
interface SelectionPoint {
  path: Array<unknown>
  offset: number
}

interface SelectionValue {
  anchor: SelectionPoint
  focus: SelectionPoint
  backward?: boolean
}

function styleToBlockType(style: string | undefined): string {
  switch (style) {
    case undefined:
    case 'normal':
      return 'P'
    case 'blockquote':
      return 'BLOCKQUOTE'
    default:
      return style.toUpperCase()
  }
}

function listItemToContainerType(listItem: string): string {
  switch (listItem) {
    case 'bullet':
      return 'UL'
    case 'number':
      return 'OL'
    default:
      return listItem.toUpperCase()
  }
}

function isDecoratorMark(schema: Schema, mark: string): boolean {
  return schema.decorators.some((d) => d.name === mark)
}

function findMarkDef(
  block: PortableTextTextBlock,
  key: string,
): PortableTextObject | undefined {
  return block.markDefs?.find((md) => md._key === key)
}

/**
 * Convert a PTE span's flat marks into nested textspec Mark nodes wrapping a Text node.
 * Decorators wrap outermost, annotations wrap innermost.
 */
function wrapInMarks(
  schema: Schema,
  block: PortableTextTextBlock,
  marks: ReadonlyArray<string>,
  inner: InlineNode,
): InlineNode {
  if (marks.length === 0) {
    return inner
  }

  const decorators: Array<string> = []
  const annotations: Array<PortableTextObject> = []

  for (const mark of marks) {
    if (isDecoratorMark(schema, mark)) {
      decorators.push(mark)
    } else {
      const markDef = findMarkDef(block, mark)
      if (markDef) {
        annotations.push(markDef)
      }
    }
  }

  let result = inner

  // Annotations innermost
  for (let i = annotations.length - 1; i >= 0; i--) {
    const markDef = annotations[i]
    if (!markDef) continue

    const attrs: Record<string, string | number | boolean> = {}
    for (const [key, value] of Object.entries(markDef)) {
      if (key === '_type' || key === '_key') continue
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        attrs[key] = value
      }
    }

    result = {
      kind: 'mark',
      type: markDef._type,
      mode: 'annotation',
      ...(Object.keys(attrs).length > 0 ? {attrs} : {}),
      children: [result],
    }
  }

  // Decorators outermost
  for (let i = decorators.length - 1; i >= 0; i--) {
    const decorator = decorators[i]
    if (!decorator) continue

    result = {
      kind: 'mark',
      type: decorator,
      mode: 'decorator',
      children: [result],
    }
  }

  return result
}

function convertChildren(
  schema: Schema,
  block: PortableTextTextBlock,
): Array<InlineNode> {
  const ctx = {schema}
  const result: Array<InlineNode> = []

  for (const child of block.children) {
    if (isSpan(ctx, child)) {
      const textNode: InlineNode = {kind: 'text', text: child.text}
      const marks = child.marks ?? []
      result.push(
        marks.length > 0
          ? wrapInMarks(schema, block, marks, textNode)
          : textNode,
      )
    } else {
      // Inline object - child is PortableTextObject (has _type, _key, and other props)
      const attrs: Record<string, string | number | boolean> = {}
      for (const [key, value] of Object.entries(child)) {
        if (key === '_type' || key === '_key') continue
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          attrs[key] = value
        }
      }

      result.push({
        kind: 'inlineObject',
        type: child._type,
        attrs,
      })
    }
  }

  return result
}

function convertTextBlock(
  schema: Schema,
  block: PortableTextTextBlock,
): TextBlock {
  return {
    kind: 'textBlock',
    type: styleToBlockType(block.style),
    children: convertChildren(schema, block),
  }
}

/**
 * Group consecutive PTE list blocks into nested textspec container blocks.
 * PTE uses a flat model (listItem + level on each block).
 * Textspec uses nested containers (UL > LI > content).
 */
function groupListBlocks(
  schema: Schema,
  blocks: Array<PortableTextTextBlock>,
): ContainerBlock {
  const first = blocks[0]
  if (!first || !first.listItem) {
    throw new Error('Expected list block')
  }

  const containerType = listItemToContainerType(first.listItem)
  const baseLevel = first.level ?? 1
  const children: Array<Block> = []

  let i = 0
  while (i < blocks.length) {
    const block = blocks[i]
    if (!block) break

    const blockLevel = block.level ?? 1

    if (blockLevel === baseLevel) {
      // Check if next blocks are nested under this one
      const nested: Array<PortableTextTextBlock> = []
      let j = i + 1
      while (j < blocks.length) {
        const next = blocks[j]
        if (!next || (next.level ?? 1) <= baseLevel) break
        nested.push(next)
        j++
      }

      if (nested.length > 0) {
        // LI with content + nested list: LI is a container with P + nested UL/OL
        const liChildren: Array<Block> = [
          convertTextBlock(schema, block),
          groupListBlocks(schema, nested),
        ]
        children.push({
          kind: 'containerBlock',
          type: 'LI',
          children: liChildren,
        })
      } else {
        // Simple LI: LI is a text block with the content directly
        children.push({
          kind: 'textBlock',
          type: 'LI',
          children: convertChildren(schema, block),
        })
      }

      i = j
    } else {
      // Deeper level - should be handled by recursion
      i++
    }
  }

  return {
    kind: 'containerBlock',
    type: containerType,
    children,
  }
}

/**
 * Resolve a PTE key-based selection point to a textspec index-based point.
 * PTE paths: [{_key: 'blockKey'}, 'children', {_key: 'childKey'}]
 * Textspec paths: [blockIndex, childIndex]
 */
function resolveSelectionPoint(
  blocks: Array<PortableTextBlock>,
  point: SelectionPoint,
  schema: Schema,
): {path: Array<number>; offset: number} | undefined {
  const ctx = {schema}

  // Extract block key from path[0]
  const blockSegment = point.path[0]
  if (
    !blockSegment ||
    typeof blockSegment !== 'object' ||
    !('_key' in blockSegment)
  ) {
    return undefined
  }
  const blockKey = blockSegment._key

  // Extract child key from path[2] (path is [blockKey, 'children', childKey])
  const childSegment = point.path[2]
  if (
    !childSegment ||
    typeof childSegment !== 'object' ||
    !('_key' in childSegment)
  ) {
    return undefined
  }
  const childKey = childSegment._key

  // Find block index in PTE blocks
  let pteBlockIndex = -1
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    if (block && isTextBlock(ctx, block) && block._key === blockKey) {
      pteBlockIndex = i
      break
    }
    if (
      block &&
      !isTextBlock(ctx, block) &&
      '_key' in block &&
      block._key === blockKey
    ) {
      pteBlockIndex = i
      break
    }
  }

  if (pteBlockIndex === -1) return undefined

  // Find child index within the block
  const pteBlock = blocks[pteBlockIndex]
  if (!pteBlock || !isTextBlock(ctx, pteBlock)) return undefined

  let childIndex = -1
  for (let i = 0; i < pteBlock.children.length; i++) {
    const child = pteBlock.children[i]
    if (child && '_key' in child && child._key === childKey) {
      childIndex = i
      break
    }
  }

  if (childIndex === -1) return undefined

  // Map pteBlockIndex to textspec block index
  // For non-list blocks this is 1:1
  // TODO: handle list block index mapping when lists are grouped into containers
  return {path: [pteBlockIndex, childIndex], offset: point.offset}
}

function convertSelection(
  blocks: Array<PortableTextBlock>,
  selection: SelectionValue | null | undefined,
  schema: Schema,
): TextspecSelection | null {
  if (!selection) return null

  const anchor = resolveSelectionPoint(blocks, selection.anchor, schema)
  const focus = resolveSelectionPoint(blocks, selection.focus, schema)

  if (!anchor || !focus) return null

  return {anchor, focus}
}

/**
 * Serialize PTE state to a textspec notation string.
 *
 * @public
 */
/**
 * @public
 */
export function toTextspec(context: {
  schema: Schema
  value: Array<PortableTextBlock>
  selection?: SelectionValue | null
}): string {
  const ctx = {schema: context.schema}
  const textspecBlocks: Array<Block> = []

  let i = 0
  while (i < context.value.length) {
    const block = context.value[i]
    if (!block) {
      i++
      continue
    }

    if (isTextBlock(ctx, block)) {
      if (block.listItem) {
        // Collect consecutive list blocks at the same or deeper level
        const listBlocks: Array<PortableTextTextBlock> = [block]
        let j = i + 1
        while (j < context.value.length) {
          const next = context.value[j]
          if (!next || !isTextBlock(ctx, next) || !next.listItem) break
          listBlocks.push(next)
          j++
        }
        textspecBlocks.push(groupListBlocks(context.schema, listBlocks))
        i = j
      } else {
        textspecBlocks.push(convertTextBlock(context.schema, block))
        i++
      }
    } else {
      // Block object
      const attrs: Record<string, string | number | boolean> = {}
      for (const [key, value] of Object.entries(block)) {
        if (key === '_type' || key === '_key') continue
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          attrs[key] = value
        }
      }

      textspecBlocks.push({
        kind: 'blockObject',
        type: block._type.toUpperCase(),
        attrs,
      })
      i++
    }
  }

  const selection = convertSelection(
    context.value,
    context.selection,
    context.schema,
  )

  const state: EditorState = {
    blocks: textspecBlocks,
    selection,
  }

  return serialize(state)
}
