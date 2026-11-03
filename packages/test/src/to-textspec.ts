import {isSpan, isTextBlock, isTypedObject} from '@portabletext/schema'
import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextTextBlock,
  Schema,
} from '@portabletext/schema'
import {serialize} from '@textspec/notation'
import type {
  Block,
  EditorState,
  InlineNode,
  TextBlock,
  Selection as NotationSelection,
} from '@textspec/notation'
import type {
  TextspecContainers,
  TextspecSelection,
  TextspecSelectionPoint,
} from './from-textspec'
import {
  childArrayField,
  getPathEntries,
  rootPosition,
  type TextspecPosition,
} from './textspec-position'

/**
 * Serialize Portable Text blocks and a selection back to textspec
 * notation, the inverse of {@link fromTextspec}.
 *
 * @public
 */
export function toTextspec(
  context: {
    schema: Schema
    value: Array<PortableTextBlock>
    selection: TextspecSelection
    containers?: TextspecContainers
    annotationKeys?: Map<string, string>
  },
  options?: {singleLine?: boolean; keys?: boolean | Set<string>},
): string {
  const position = rootPosition(context.schema, context.containers ?? new Map())
  const conversion: Conversion = {
    annotationKeys: context.annotationKeys,
    keys: options?.keys || undefined,
  }
  const textspecBlocks = context.value.map((block) =>
    convertBlockToTextspec(position, conversion, block),
  )

  const selection = convertSelection(position, context.value, context.selection)

  const state: EditorState = {
    blocks: textspecBlocks,
    selection,
  }

  return serialize(state, options?.singleLine ? {singleLine: true} : undefined)
}

type Conversion = {
  annotationKeys: Map<string, string> | undefined
  keys: true | Set<string> | undefined
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

function addKeys(
  source: PortableTextBlock,
  target: Block,
  keys: true | Set<string> | undefined,
): Block {
  const key = source['_key']
  if (keys === undefined || typeof key !== 'string') {
    return target
  }

  if (keys !== true && !keys.has(key)) {
    return target
  }

  if (target.kind === 'rawBlock') {
    return target
  }

  return {...target, attrs: {_key: key, ...(target.attrs ?? {})}}
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
 * The marks of a span that render as textspec mark nodes: decorators the
 * schema declares, and annotations with a markDef on the block. Any other
 * mark is dropped, so selection paths count only these.
 */
function renderedMarks(
  schema: Schema,
  block: PortableTextTextBlock,
  marks: ReadonlyArray<string>,
): {decorators: Array<string>; annotations: Array<PortableTextObject>} {
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

  return {decorators, annotations}
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

  const {decorators, annotations} = renderedMarks(schema, block, marks)

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
  position: TextspecPosition,
  blocks: Array<PortableTextBlock>,
  point: TextspecSelectionPoint,
): {path: Array<number>; offset: number} | undefined {
  const entries = getPathEntries(position, blocks, point.path)

  if (!entries) {
    return undefined
  }

  const indexedPath = entries.map((entry) => entry.index)

  // PTE has flat spans with a marks array; textspec nests each rendered mark
  // as a wrapper node, so the text node sits one level deeper per mark.
  const leaf = entries.at(-1)
  const parent = entries.at(-2)

  if (
    leaf &&
    parent &&
    isTextBlock({schema: parent.position.schema}, parent.node) &&
    isSpan({schema: leaf.position.schema}, leaf.node)
  ) {
    const {decorators, annotations} = renderedMarks(
      leaf.position.schema,
      parent.node,
      leaf.node.marks ?? [],
    )

    for (let i = 0; i < decorators.length + annotations.length; i++) {
      indexedPath.push(0)
    }
  }

  return {path: indexedPath, offset: point.offset}
}

function convertBlockToTextspec(
  position: TextspecPosition,
  conversion: Conversion,
  block: PortableTextBlock,
): Block {
  return addKeys(
    block,
    convertBlockWithoutKey(position, conversion, block),
    conversion.keys,
  )
}

function convertBlockWithoutKey(
  position: TextspecPosition,
  conversion: Conversion,
  block: PortableTextBlock,
): Block {
  if (isTextBlock({schema: position.schema}, block)) {
    return convertTextBlock(position.schema, block, conversion.annotationKeys)
  }

  const container = childArrayField(position, block)
  if (container) {
    const fieldValue = block[container.name]

    return {
      kind: 'containerBlock',
      type: block._type.toUpperCase(),
      children: Array.isArray(fieldValue)
        ? fieldValue
            .filter((item): item is PortableTextBlock => isTypedObject(item))
            .map((item) =>
              convertBlockToTextspec(container.position, conversion, item),
            )
        : [],
    }
  }

  return {
    kind: 'blockObject',
    type: block._type.toUpperCase(),
    attrs: extractPrimitiveAttrs(block),
  }
}

function convertSelection(
  position: TextspecPosition,
  blocks: Array<PortableTextBlock>,
  selection: TextspecSelection,
): NotationSelection | null {
  if (!selection) {
    return null
  }

  const anchor = resolveSelectionPoint(position, blocks, selection.anchor)
  const focus = resolveSelectionPoint(position, blocks, selection.focus)

  if (!anchor || !focus) {
    return null
  }

  // PTE represents a selected block object as a collapsed selection at
  // offset 0 of the block's path. Textspec represents it as a range from
  // offset 0 to offset 1. The parent check excludes inline nodes whose path
  // sits inside a text block's `children`, where offset 0 means "caret
  // before this child", not "this child is selected".
  if (
    anchor.offset === 0 &&
    focus.offset === 0 &&
    isEqualIndexedPaths(anchor.path, focus.path)
  ) {
    const entries = getPathEntries(position, blocks, selection.anchor.path)
    const node = entries?.at(-1)
    const parent = entries?.at(-2)

    if (
      node &&
      !isTextBlock({schema: node.position.schema}, node.node) &&
      (!parent || !isTextBlock({schema: parent.position.schema}, parent.node))
    ) {
      return {anchor, focus: {path: focus.path, offset: 1}}
    }
  }

  return {anchor, focus}
}

function isEqualIndexedPaths(
  a: ReadonlyArray<number>,
  b: ReadonlyArray<number>,
): boolean {
  if (a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}
