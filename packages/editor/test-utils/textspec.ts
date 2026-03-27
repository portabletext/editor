import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
  Schema,
} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import {
  parse,
  serialize,
  type Block,
  type EditorState,
  type InlineNode,
  type TextBlock,
  type Point as TextspecPoint,
  type Selection as TextspecSelection,
} from '@textspec/notation'
import type {EditorSelection, EditorSelectionPoint} from '../src/types/editor'

interface ToTextspecContext {
  schema: Schema
  value: Array<PortableTextBlock>
  selection?: EditorSelection
}

interface ToTextspecOptions {
  singleLine?: boolean
}

interface FromTextspecContext {
  schema: Schema
  keyGenerator: () => string
}

interface FromTextspecResult {
  blocks: Array<PortableTextBlock>
  selection: EditorSelection
}

export function toTextspec(
  context: ToTextspecContext,
  options?: ToTextspecOptions,
): string {
  const textspecBlocks: Array<Block> = []
  const childMappings: Array<ChildMapping> = []

  for (const block of context.value) {
    if (isTextBlock({schema: context.schema}, block)) {
      const mapping = buildChildMapping(context, block)
      childMappings.push(mapping)
      textspecBlocks.push(buildTextBlock(block, mapping.textspecChildren))
    } else {
      childMappings.push({textspecChildren: [], entries: []})
      textspecBlocks.push(blockObjectToTextspec(context, block))
    }
  }

  const selection = selectionToTextspec(context, childMappings)

  const editorState: EditorState = {
    blocks: textspecBlocks,
    selection,
  }

  return serialize(editorState, {singleLine: options?.singleLine})
}

export function fromTextspec(
  context: FromTextspecContext,
  input: string,
): FromTextspecResult {
  const editorState = parse(input)
  const blocks: Array<PortableTextBlock> = []

  for (const block of editorState.blocks) {
    if (block.kind === 'textBlock') {
      blocks.push(textBlockFromTextspec(context, block))
    } else if (block.kind === 'blockObject') {
      blocks.push(blockObjectFromTextspec(context, block))
    }
  }

  const selection = selectionFromTextspec(
    blocks,
    context,
    editorState.blocks,
    editorState.selection,
  )

  return {blocks, selection}
}

interface ChildMappingEntry {
  ptChildIndex: number
  textspecPath: Array<number>
}

interface ChildMapping {
  textspecChildren: Array<InlineNode>
  entries: Array<ChildMappingEntry>
}

function buildChildMapping(
  context: ToTextspecContext,
  block: PortableTextTextBlock,
): ChildMapping {
  const textspecChildren: Array<InlineNode> = []
  const entries: Array<ChildMappingEntry> = []

  for (let ptIndex = 0; ptIndex < block.children.length; ptIndex++) {
    const child = block.children[ptIndex]

    if (!child) {
      continue
    }

    if (isSpan({schema: context.schema}, child)) {
      const textspecNodes = spanToTextspec(context, block, child)
      const textspecIndex = textspecChildren.length
      textspecChildren.push(...textspecNodes)

      const pathToText = findTextPath(textspecNodes[0])
      entries.push({
        ptChildIndex: ptIndex,
        textspecPath: [textspecIndex, ...pathToText],
      })
    } else {
      const textspecIndex = textspecChildren.length
      textspecChildren.push({
        kind: 'inlineObject',
        type: child._type,
        attrs: {},
      })
      entries.push({
        ptChildIndex: ptIndex,
        textspecPath: [textspecIndex],
      })
    }
  }

  return {textspecChildren, entries}
}

function findTextPath(node: InlineNode | undefined): Array<number> {
  if (!node) {
    return []
  }

  if (node.kind === 'text') {
    return []
  }

  if (node.kind === 'mark') {
    return [0, ...findTextPath(node.children[0])]
  }

  return []
}

function buildTextBlock(
  block: PortableTextTextBlock,
  textspecChildren: Array<InlineNode>,
): TextBlock {
  const attrs: Record<string, string | number> = {}

  if (block.style && block.style !== 'normal') {
    attrs['style'] = block.style
  }

  if (block.listItem) {
    attrs['listItem'] = block.listItem
  }

  if (block.level !== undefined) {
    attrs['level'] = block.level
  }

  return {
    kind: 'textBlock',
    type: 'B',
    ...(Object.keys(attrs).length > 0 ? {attrs} : {}),
    children: textspecChildren,
  }
}

function blockObjectToTextspec(
  context: ToTextspecContext,
  block: PortableTextBlock,
): Block {
  const blockObjectType = context.schema.blockObjects.find(
    (blockObject) => blockObject.name === block._type,
  )

  return {
    kind: 'blockObject',
    type: blockObjectType ? block._type.toUpperCase() : block._type,
    attrs: {},
  }
}

function spanToTextspec(
  context: ToTextspecContext,
  block: PortableTextTextBlock,
  span: PortableTextSpan,
): Array<InlineNode> {
  const textNode: InlineNode = {
    kind: 'text',
    text: span.text,
  }

  if (!span.marks || span.marks.length === 0) {
    return [textNode]
  }

  const decoratorNames = context.schema.decorators.map(
    (decorator) => decorator.name,
  )
  const decoratorMarks = span.marks.filter((mark) =>
    decoratorNames.includes(mark),
  )
  const annotationKeys = span.marks.filter(
    (mark) => !decoratorNames.includes(mark),
  )

  let wrapped: InlineNode = textNode

  for (const annotationKey of annotationKeys) {
    const markDef = block.markDefs?.find(
      (definition) => definition._key === annotationKey,
    )

    if (markDef) {
      const attrs: Record<string, string> = {}

      for (const [key, value] of Object.entries(markDef)) {
        if (key !== '_type' && key !== '_key') {
          attrs[key] = String(value)
        }
      }

      wrapped = {
        kind: 'mark',
        type: markDef._type,
        mode: 'annotation',
        ...(Object.keys(attrs).length > 0 ? {attrs} : {}),
        children: [wrapped],
      }
    }
  }

  for (const decoratorMark of decoratorMarks) {
    wrapped = {
      kind: 'mark',
      type: decoratorMark,
      mode: 'decorator',
      children: [wrapped],
    }
  }

  return [wrapped]
}

function selectionToTextspec(
  context: ToTextspecContext,
  childMappings: Array<ChildMapping>,
): TextspecSelection | null {
  if (!context.selection) {
    return null
  }

  const anchor = selectionPointToTextspec(
    context,
    childMappings,
    context.selection.anchor,
  )
  const focus = selectionPointToTextspec(
    context,
    childMappings,
    context.selection.focus,
  )

  if (!anchor || !focus) {
    return null
  }

  return {anchor, focus}
}

function selectionPointToTextspec(
  context: ToTextspecContext,
  childMappings: Array<ChildMapping>,
  point: EditorSelectionPoint,
): TextspecPoint | null {
  const blockKey = point.path[0]

  if (!blockKey || typeof blockKey !== 'object' || !('_key' in blockKey)) {
    return null
  }

  const blockIndex = context.value.findIndex(
    (block) => block._key === blockKey._key,
  )

  if (blockIndex === -1) {
    return null
  }

  const block = context.value[blockIndex]

  if (!block) {
    return null
  }

  if (!isTextBlock({schema: context.schema}, block)) {
    return {path: [blockIndex], offset: point.offset}
  }

  const childKeySegment = point.path[2]

  if (
    !childKeySegment ||
    typeof childKeySegment !== 'object' ||
    !('_key' in childKeySegment)
  ) {
    return {path: [blockIndex], offset: point.offset}
  }

  const ptChildIndex = block.children.findIndex(
    (child) => child._key === childKeySegment._key,
  )

  if (ptChildIndex === -1) {
    return {path: [blockIndex], offset: point.offset}
  }

  const mapping = childMappings[blockIndex]

  if (!mapping) {
    return null
  }

  const entry = mapping.entries.find(
    (mappingEntry) => mappingEntry.ptChildIndex === ptChildIndex,
  )

  if (!entry) {
    return null
  }

  const child = block.children[ptChildIndex]

  if (
    child &&
    isSpan({schema: context.schema}, child) &&
    point.offset === child.text.length &&
    child.marks &&
    child.marks.length > 0 &&
    ptChildIndex === block.children.length - 1
  ) {
    const topTextspecIndex = entry.textspecPath[0]
    if (topTextspecIndex !== undefined) {
      return {
        path: [blockIndex, topTextspecIndex + 1],
        offset: 0,
      }
    }
  }

  return {
    path: [blockIndex, ...entry.textspecPath],
    offset: point.offset,
  }
}

function textBlockFromTextspec(
  context: FromTextspecContext,
  textBlock: TextBlock,
): PortableTextTextBlock {
  const style = textBlock.attrs?.['style']
  const listItem = textBlock.attrs?.['listItem']
  const level = textBlock.attrs?.['level']

  const blockKey = context.keyGenerator()
  const markDefs: Array<PortableTextObject> = []
  const children: Array<PortableTextSpan | PortableTextObject> = []

  for (const child of textBlock.children) {
    inlineNodeFromTextspec(context, child, [], markDefs, children)
  }

  if (children.length === 0) {
    children.push({
      _key: context.keyGenerator(),
      _type: 'span',
      text: '',
      marks: [],
    })
  }

  const block: PortableTextTextBlock = {
    _type: context.schema.block.name,
    _key: blockKey,
    children,
    markDefs,
    style: typeof style === 'string' ? style : 'normal',
  }

  if (typeof listItem === 'string') {
    block.listItem = listItem
  }

  if (typeof level === 'number') {
    block.level = level
  }

  return block
}

function inlineNodeFromTextspec(
  context: FromTextspecContext,
  node: InlineNode,
  marks: Array<string>,
  markDefs: Array<PortableTextObject>,
  children: Array<PortableTextSpan | PortableTextObject>,
): void {
  if (node.kind === 'text') {
    children.push({
      _key: context.keyGenerator(),
      _type: 'span',
      text: node.text,
      marks: [...marks],
    })
    return
  }

  if (node.kind === 'inlineObject') {
    children.push({
      _key: context.keyGenerator(),
      _type: node.type,
    })
    return
  }

  if (node.kind === 'mark') {
    if (node.mode === 'decorator') {
      const updatedMarks = [...marks, node.type]
      for (const child of node.children) {
        inlineNodeFromTextspec(context, child, updatedMarks, markDefs, children)
      }
    } else {
      const annotationKey = context.keyGenerator()
      const markDef: PortableTextObject = {
        _type: node.type,
        _key: annotationKey,
      }

      if (node.attrs) {
        for (const [key, value] of Object.entries(node.attrs)) {
          markDef[key] = value
        }
      }

      markDefs.push(markDef)
      const updatedMarks = [...marks, annotationKey]

      for (const child of node.children) {
        inlineNodeFromTextspec(context, child, updatedMarks, markDefs, children)
      }
    }
  }
}

function blockObjectFromTextspec(
  context: FromTextspecContext,
  block: Block,
): PortableTextObject {
  if (block.kind !== 'blockObject') {
    throw new Error(`Expected blockObject, got ${block.kind}`)
  }

  const typeName = block.type.toLowerCase()
  const matchingType = context.schema.blockObjects.find(
    (blockObject) => blockObject.name === typeName,
  )

  return {
    _type: matchingType ? matchingType.name : typeName,
    _key: context.keyGenerator(),
  }
}

function selectionFromTextspec(
  blocks: Array<PortableTextBlock>,
  context: FromTextspecContext,
  textspecBlocks: Array<Block>,
  textspecSelection: TextspecSelection | null,
): EditorSelection {
  if (!textspecSelection) {
    return null
  }

  const anchor = selectionPointFromTextspec(
    blocks,
    context,
    textspecBlocks,
    textspecSelection.anchor,
  )
  const focus = selectionPointFromTextspec(
    blocks,
    context,
    textspecBlocks,
    textspecSelection.focus,
  )

  if (!anchor || !focus) {
    return null
  }

  return {anchor, focus}
}

function selectionPointFromTextspec(
  blocks: Array<PortableTextBlock>,
  context: FromTextspecContext,
  textspecBlocks: Array<Block>,
  point: TextspecPoint,
): EditorSelectionPoint | null {
  const blockIndex = point.path[0]

  if (blockIndex === undefined) {
    return null
  }

  const block = blocks[blockIndex]

  if (!block) {
    return null
  }

  if (!isTextBlock({schema: context.schema}, block)) {
    return {
      path: [{_key: block._key}],
      offset: point.offset,
    }
  }

  const textspecBlock = textspecBlocks[blockIndex]

  if (!textspecBlock || textspecBlock.kind !== 'textBlock') {
    return null
  }

  const textspecChildIndex = point.path[1]

  if (textspecChildIndex === undefined) {
    return {
      path: [{_key: block._key}],
      offset: point.offset,
    }
  }

  const ptChildResult = resolveTextspecPathToPtChild(
    block,
    textspecBlock,
    point.path.slice(1),
    point.offset,
  )

  if (!ptChildResult) {
    return null
  }

  const ptChild = block.children[ptChildResult.ptChildIndex]

  if (!ptChild) {
    return null
  }

  return {
    path: [{_key: block._key}, 'children', {_key: ptChild._key}],
    offset: ptChildResult.offset,
  }
}

function resolveTextspecPathToPtChild(
  block: PortableTextTextBlock,
  textspecBlock: TextBlock,
  childPath: Array<number>,
  offset: number,
): {ptChildIndex: number; offset: number} | null {
  const topChildIndex = childPath[0]

  if (topChildIndex === undefined) {
    return null
  }

  if (topChildIndex >= textspecBlock.children.length) {
    const lastPtChildIndex = block.children.length - 1
    const lastChild = block.children[lastPtChildIndex]

    if (
      lastChild &&
      'text' in lastChild &&
      typeof lastChild.text === 'string'
    ) {
      return {ptChildIndex: lastPtChildIndex, offset: lastChild.text.length}
    }

    return {ptChildIndex: Math.max(0, lastPtChildIndex), offset}
  }

  const textspecChild = textspecBlock.children[topChildIndex]

  if (!textspecChild) {
    return null
  }

  let ptChildIndex = 0

  for (let index = 0; index < topChildIndex; index++) {
    const child = textspecBlock.children[index]

    if (child) {
      ptChildIndex += countPtChildren(child)
    }
  }

  if (childPath.length > 1) {
    const nestedResult = resolveNestedPath(
      textspecChild,
      childPath.slice(1),
      ptChildIndex,
    )
    if (nestedResult !== null) {
      return {ptChildIndex: ptChildIndex + nestedResult, offset}
    }
  }

  return {ptChildIndex, offset}
}

function countPtChildren(node: InlineNode): number {
  if (node.kind === 'text' || node.kind === 'inlineObject') {
    return 1
  }

  if (node.kind === 'mark') {
    let count = 0
    for (const child of node.children) {
      count += countPtChildren(child)
    }
    return count
  }

  return 0
}

function resolveNestedPath(
  node: InlineNode,
  path: Array<number>,
  baseIndex: number,
): number | null {
  if (node.kind !== 'mark') {
    return null
  }

  const childIndex = path[0]

  if (childIndex === undefined) {
    return null
  }

  const child = node.children[childIndex]

  if (!child) {
    return null
  }

  if (path.length > 1) {
    return resolveNestedPath(child, path.slice(1), baseIndex)
  }

  return 0
}
