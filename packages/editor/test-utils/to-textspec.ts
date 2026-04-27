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
import type {Containers} from '../src/schema/resolve-containers'
import type {EditorSelection, EditorSelectionPoint} from '../src/types/editor'

/**
 * Serialize PTE state to a textspec notation string.
 */
export function toTextspec(
  context: {
    schema: Schema
    value: Array<PortableTextBlock>
    selection: EditorSelection
    containers?: Containers
    annotationKeys?: Map<string, string>
  },
  options?: {singleLine?: boolean; keys?: boolean | Set<string>},
): string {
  const containers = context.containers ?? new Map()
  const annotationKeys = context.annotationKeys
  const textspecBlocks: Array<Block> = []

  for (const block of context.value) {
    const converted = convertBlockToTextspec(
      context.schema,
      containers,
      annotationKeys,
      block,
    )
    if (options?.keys) {
      addKeys(block as Record<string, unknown>, converted, options.keys)
    }
    textspecBlocks.push(converted)
  }

  const selection = convertSelection(
    context.schema,
    context.value,
    context.selection,
  )

  const state: EditorState = {
    blocks: textspecBlocks,
    selection,
  }

  return serialize(state, options?.singleLine ? {singleLine: true} : undefined)
}

function extractPrimitiveAttrs(
  obj: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const attrs: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (key === '_type' || key === '_key') {
      continue
    }
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      attrs[key] = value
    }
  }
  return attrs
}

/**
 * Add a `_key` attribute to a top-level block in the converted textspec
 * tree. When `keys` is `true`, all blocks get their keys emitted. When
 * `keys` is a Set, only blocks whose key is in the set get it emitted —
 * this lets callers assert preservation of specific keys without churn
 * from every other block.
 */
function addKeys(
  source: Record<string, unknown>,
  target: Block | InlineNode,
  keys: true | Set<string>,
): void {
  const key = source['_key']
  if (typeof key !== 'string') {
    return
  }

  if (keys !== true && !keys.has(key)) {
    return
  }

  if (
    target.kind === 'textBlock' ||
    target.kind === 'blockObject' ||
    target.kind === 'containerBlock' ||
    target.kind === 'inlineObject'
  ) {
    target.attrs = {_key: key, ...(target.attrs ?? {})}
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
  annotationKeys: Map<string, string> | undefined,
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
    if (!markDef) {
      continue
    }

    const attrs: Record<string, string | number | boolean> = {
      ...extractPrimitiveAttrs(markDef),
    }

    const symbolicKey = annotationKeys?.get(markDef._key)
    if (symbolicKey !== undefined) {
      attrs['_key'] = symbolicKey
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
    if (!decorator) {
      continue
    }

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
  annotationKeys: Map<string, string> | undefined,
): Array<InlineNode> {
  const ctx = {schema}
  const result: Array<InlineNode> = []

  for (const child of block.children) {
    if (isSpan(ctx, child)) {
      const textNode: InlineNode = {kind: 'text', text: child.text}
      const marks = child.marks ?? []
      result.push(
        marks.length > 0
          ? wrapInMarks(schema, block, marks, annotationKeys, textNode)
          : textNode,
      )
    } else {
      result.push({
        kind: 'inlineObject',
        type: child._type,
        attrs: extractPrimitiveAttrs(child),
      })
    }
  }

  return result
}

function convertTextBlock(
  schema: Schema,
  block: PortableTextTextBlock,
  annotationKeys: Map<string, string> | undefined,
): TextBlock {
  const attrs: Record<string, string | number | boolean> = {}

  if (block['style'] && block['style'] !== 'normal') {
    attrs['style'] = block['style']
  }

  if (block['listItem']) {
    attrs['listItem'] = block['listItem']
  }

  if (block['level'] !== undefined && block['level'] > 1) {
    attrs['level'] = block['level']
  }

  return {
    kind: 'textBlock',
    type: 'B',
    ...(Object.keys(attrs).length > 0 ? {attrs} : {}),
    children: convertChildren(schema, block, annotationKeys),
  }
}

function resolveSelectionPoint(
  schema: Schema,
  blocks: Array<PortableTextBlock>,
  point: EditorSelectionPoint,
): {path: Array<number>; offset: number} | undefined {
  const indexedPath = keyedPathToIndexedPath(
    point.path,
    blocks as Array<Record<string, unknown>>,
  )

  if (!indexedPath) {
    return undefined
  }

  // Account for mark nesting depth in textspec.
  // PTE has flat spans with marks array. Textspec nests marks as wrapper nodes.
  // Each mark on a span adds one level of nesting, so the text node is
  // at depth = number of marks below the child index.
  const markDepth = getMarkDepth(schema, blocks, indexedPath)

  for (let i = 0; i < markDepth; i++) {
    indexedPath.push(0)
  }

  return {path: indexedPath, offset: point.offset}
}

function getMarkDepth(
  schema: Schema,
  blocks: Array<PortableTextBlock>,
  indexedPath: Array<number>,
): number {
  if (indexedPath.length < 2) {
    return 0
  }

  const blockIndex = indexedPath[0]
  const childIndex = indexedPath[1]

  if (blockIndex === undefined || childIndex === undefined) {
    return 0
  }

  const block = blocks[blockIndex]

  if (!block || !isTextBlock({schema}, block)) {
    return 0
  }

  const child = block.children[childIndex]

  if (!child || !isSpan({schema}, child)) {
    return 0
  }

  return child.marks?.length ?? 0
}

function keyedPathToIndexedPath(
  keyedPath: EditorSelectionPoint['path'],
  children: Array<Record<string, unknown>>,
): Array<number> | undefined {
  const indexedPath: Array<number> = []
  let currentChildren = children
  let currentNode: Record<string, unknown> | undefined

  for (const segment of keyedPath) {
    if (typeof segment === 'object' && segment !== null && '_key' in segment) {
      const index = currentChildren.findIndex(
        (child) => child['_key'] === segment._key,
      )

      if (index === -1) {
        return undefined
      }

      indexedPath.push(index)
      currentNode = currentChildren[index]
    } else if (typeof segment === 'string' && currentNode) {
      const field = currentNode[segment]

      if (Array.isArray(field)) {
        currentChildren = field as Array<Record<string, unknown>>
      } else {
        return undefined
      }
    } else {
      return undefined
    }
  }

  return indexedPath
}

function convertBlockToTextspec(
  schema: Schema,
  containers: Containers,
  annotationKeys: Map<string, string> | undefined,
  block: PortableTextBlock,
): Block {
  if (isTextBlock({schema}, block)) {
    return convertTextBlock(schema, block, annotationKeys)
  }

  if (containers.has(block._type)) {
    return convertContainerBlock(
      schema,
      containers,
      annotationKeys,
      block,
      block._type,
    )
  }

  return {
    kind: 'blockObject',
    type: block._type.toUpperCase(),
    attrs: extractPrimitiveAttrs(block),
  }
}

function convertContainerBlock(
  schema: Schema,
  containers: Containers,
  annotationKeys: Map<string, string> | undefined,
  block: Record<string, unknown>,
  scopePath: string,
): ContainerBlock {
  const containerField = containers.get(scopePath)?.field

  if (!containerField) {
    return {
      kind: 'containerBlock',
      type:
        typeof block['_type'] === 'string' ? block['_type'].toUpperCase() : '',
      children: [],
    }
  }

  const fieldValue = block[containerField.name]
  const children: Array<Block> = []
  const schemaContext = {schema}

  if (Array.isArray(fieldValue)) {
    for (const item of fieldValue) {
      if (isTextBlock(schemaContext, item)) {
        children.push(convertTextBlock(schema, item, annotationKeys))
      } else if (
        typeof item === 'object' &&
        item !== null &&
        '_type' in item &&
        typeof item._type === 'string'
      ) {
        const typedItem = item as Record<string, unknown>
        const childScopePath = `${scopePath}.${item._type}`

        if (containers.has(childScopePath)) {
          children.push(
            convertContainerBlock(
              schema,
              containers,
              annotationKeys,
              typedItem,
              childScopePath,
            ),
          )
        } else {
          children.push({
            kind: 'blockObject',
            type: item._type.toUpperCase(),
            attrs: extractPrimitiveAttrs(typedItem),
          })
        }
      }
    }
  }

  return {
    kind: 'containerBlock',
    type:
      typeof block['_type'] === 'string' ? block['_type'].toUpperCase() : '',
    children,
  }
}

function convertSelection(
  schema: Schema,
  blocks: Array<PortableTextBlock>,
  selection: EditorSelection,
): TextspecSelection | null {
  if (!selection) {
    return null
  }

  const anchor = resolveSelectionPoint(schema, blocks, selection.anchor)
  const focus = resolveSelectionPoint(schema, blocks, selection.focus)

  if (!anchor || !focus) {
    return null
  }

  // PTE represents a selected block object as a collapsed selection at
  // offset 0 of the block's path. Textspec represents it as a range from
  // offset 0 to offset 1. Translate when both points resolve to the same
  // path of a non-text block.
  if (
    anchor.offset === 0 &&
    focus.offset === 0 &&
    anchor.path.length === 1 &&
    focus.path.length === 1 &&
    anchor.path[0] === focus.path[0]
  ) {
    const blockIndex = anchor.path[0]
    const block = blockIndex !== undefined ? blocks[blockIndex] : undefined

    if (block && !isTextBlock({schema}, block)) {
      return {anchor, focus: {path: focus.path, offset: 1}}
    }
  }

  return {anchor, focus}
}
