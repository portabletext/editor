import type {Path} from '@portabletext/patches'
import type {
  FieldDefinition,
  OfDefinition,
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
  Schema,
} from '@portabletext/schema'
import {isTextBlock, isTypedObject} from '@portabletext/schema'
import type {
  Block,
  ContainerBlock,
  InlineNode,
  TextBlock,
  Block as TextspecBlock,
} from '@textspec/notation'
import {parse} from '@textspec/notation'
import {
  childArrayField,
  containerPosition,
  resolveTextspecContainer,
  rootPosition,
  type TextspecPosition,
} from './textspec-position'

/**
 * A registered container: the schema-declared field holding its children,
 * plus any positional child registrations that override the top-level
 * registration when resolving a nested container.
 * @public
 */
export type TextspecContainerRegistration = {
  kind: 'container'
  type: string
  field: FieldDefinition & {type: 'array'; of: ReadonlyArray<OfDefinition>}
  of?: ReadonlyArray<
    | TextspecContainerRegistration
    | {kind: 'span'; type: string}
    | {kind: 'blockObject'; type: string}
    | {kind: 'inlineObject'; type: string}
  >
}

/**
 * Map of registered containers, keyed by `_type`.
 * @public
 */
export type TextspecContainers = ReadonlyMap<
  string,
  TextspecContainerRegistration
>

/** @public */
export type TextspecSelectionPoint = {path: Path; offset: number}
/** @public */
export type TextspecSelection = {
  anchor: TextspecSelectionPoint
  focus: TextspecSelectionPoint
  backward?: boolean
} | null

/**
 * Parse textspec notation into Portable Text blocks and a selection,
 * deterministic under the supplied key generator. Pass `containers` to
 * resolve container schemas (block objects with array fields holding
 * further blocks or container objects).
 *
 * @public
 */
export function fromTextspec(
  context: {
    schema: Schema
    keyGenerator: () => string
    containers?: TextspecContainers
  },
  textspec: string,
): {
  blocks: Array<PortableTextBlock>
  selection: TextspecSelection
} {
  // If no selection markers are present, add a cursor at the end
  // to satisfy the parser's requirement for a selection marker.
  const hasSelection = /(?<!\\)[|^]/.test(textspec)
  const input = hasSelection ? textspec : `${textspec}|`
  const state = parse(input)
  const position = rootPosition(context.schema, context.containers ?? new Map())
  const blocks = state.blocks.flatMap((block) =>
    convertBlockToPTE(position, block, context.keyGenerator),
  )

  const selection = convertSelectionToPTE(position, state.blocks, blocks, state)

  return {blocks, selection}
}

function blockTypeToStyle(type: string): string {
  switch (type) {
    case 'P':
    case 'B':
      return 'normal'
    case 'BLOCKQUOTE':
      return 'blockquote'
    default:
      return type.toLowerCase()
  }
}

function containerTypeToListItem(type: string): string {
  switch (type) {
    case 'UL':
      return 'bullet'
    case 'OL':
      return 'number'
    default:
      return type.toLowerCase()
  }
}

/**
 * Flatten nested textspec marks into PTE's flat marks array + markDefs.
 * Returns an array of PTE children (spans and inline objects).
 */
function flattenInlineNode(
  schema: Schema,
  node: InlineNode,
  keyGenerator: () => string,
  parentMarks: Array<string>,
  markDefs: Array<PortableTextObject>,
): Array<PortableTextSpan | PortableTextObject> {
  switch (node.kind) {
    case 'text': {
      return [
        {
          _key: keyGenerator(),
          _type: schema.span.name,
          text: node.text,
          marks: [...parentMarks],
        },
      ]
    }

    case 'mark': {
      let markId: string

      if (node.mode === 'decorator') {
        markId = node.type
      } else {
        // Annotation or overlay: create a markDef. Honour an explicit `_key`
        // attribute so tests can reference specific annotation keys in both
        // setup and assertions.
        const providedKey =
          typeof node.attrs?.['_key'] === 'string'
            ? node.attrs['_key']
            : undefined
        markId = providedKey ?? keyGenerator()
        const {_key: _discardedKey, ...restAttrs} = node.attrs ?? {}
        markDefs.push({
          _type: node.type,
          _key: markId,
          ...restAttrs,
        })
      }

      const childMarks = [...parentMarks, markId]
      const results: Array<PortableTextSpan | PortableTextObject> = []

      for (const child of node.children) {
        const flattened = flattenInlineNode(
          schema,
          child,
          keyGenerator,
          childMarks,
          markDefs,
        )
        for (const item of flattened) {
          results.push(item)
        }
      }

      return results
    }

    case 'inlineObject': {
      return [
        {
          _type: node.type,
          _key: keyGenerator(),
          ...node.attrs,
        },
      ]
    }
  }
}

function convertTextBlockToPTE(
  schema: Schema,
  block: TextBlock,
  keyGenerator: () => string,
  style: string,
  listItem?: string,
  level?: number,
  explicitKey?: string,
): PortableTextTextBlock {
  const blockKey = explicitKey ?? keyGenerator()
  const markDefs: Array<PortableTextObject> = []
  const children: Array<PortableTextSpan | PortableTextObject> = []

  for (const child of block.children) {
    const flattened = flattenInlineNode(
      schema,
      child,
      keyGenerator,
      [],
      markDefs,
    )
    for (const item of flattened) {
      children.push(item)
    }
  }

  if (children.length === 0) {
    children.push({
      _key: keyGenerator(),
      _type: schema.span.name,
      text: '',
      marks: [],
    })
  }

  const result: PortableTextTextBlock = {
    _type: schema.block.name,
    _key: blockKey,
    children,
    ...(markDefs.length > 0 ? {markDefs} : {}),
    style,
    ...(listItem ? {listItem, level: level ?? 1} : level ? {level} : {}),
  }

  return result
}

/**
 * Flatten a textspec container block (UL/OL) into PTE's flat list blocks.
 */
function flattenContainer(
  schema: Schema,
  container: ContainerBlock,
  keyGenerator: () => string,
): Array<PortableTextTextBlock> {
  return listItems(container, 1).map((item) =>
    convertTextBlockToPTE(
      schema,
      item.block,
      keyGenerator,
      item.style,
      item.listItem,
      item.level,
    ),
  )
}

/**
 * Conversion and selection both map list items through this, so they cannot
 * disagree on which flat block a notation item becomes.
 */
function listItems(
  container: ContainerBlock,
  level: number,
): Array<{
  block: TextBlock
  style: string
  listItem: string
  level: number
  path: Array<number>
}> {
  const listItem = containerTypeToListItem(container.type)
  const results: ReturnType<typeof listItems> = []

  for (const [index, child] of container.children.entries()) {
    if (child.kind === 'textBlock' && child.type === 'LI') {
      results.push({
        block: child,
        style: 'normal',
        listItem,
        level,
        path: [index],
      })
    } else if (child.kind === 'containerBlock' && child.type === 'LI') {
      for (const [liIndex, liChild] of child.children.entries()) {
        if (liChild.kind === 'textBlock') {
          results.push({
            block: liChild,
            style: blockTypeToStyle(liChild.type),
            listItem,
            level,
            path: [index, liIndex],
          })
        } else if (liChild.kind === 'containerBlock') {
          for (const nested of listItems(liChild, level + 1)) {
            results.push({...nested, path: [index, liIndex, ...nested.path]})
          }
        }
      }
    }
  }

  return results
}

/**
 * Convert a textspec block to PTE blocks.
 * A single textspec container block may produce multiple PTE blocks (flat list model).
 */
function convertBlockToPTE(
  position: TextspecPosition,
  block: Block,
  keyGenerator: () => string,
): Array<PortableTextBlock> {
  const explicitKey =
    block.attrs && typeof block.attrs['_key'] === 'string'
      ? block.attrs['_key']
      : undefined

  switch (block.kind) {
    case 'textBlock': {
      let style = blockTypeToStyle(block.type)
      let listItem: string | undefined
      let level: number | undefined

      if (block.type === 'B' && block.attrs) {
        if (typeof block.attrs['style'] === 'string') {
          style = block.attrs['style']
        }
        if (typeof block.attrs['listItem'] === 'string') {
          listItem = block.attrs['listItem']
        }
        if (typeof block.attrs['level'] === 'number') {
          level = block.attrs['level']
        }
      }

      return [
        convertTextBlockToPTE(
          position.schema,
          block,
          keyGenerator,
          style,
          listItem,
          level,
          explicitKey,
        ),
      ]
    }

    case 'containerBlock': {
      if (isListContainer(block.type)) {
        return flattenContainer(position.schema, block, keyGenerator)
      }

      const registration = resolveTextspecContainer(position, block.type)

      if (registration) {
        const childPosition = containerPosition(position, registration)
        const children = block.children.flatMap((child) =>
          convertBlockToPTE(childPosition, child, keyGenerator),
        )

        return [
          {
            _type: registration.type,
            _key: explicitKey ?? keyGenerator(),
            [registration.field.name]: children,
          },
        ]
      }

      // Fallback: unknown container type
      return [
        {
          _type: block.type.toLowerCase(),
          _key: keyGenerator(),
        },
      ]
    }

    case 'blockObject':
    case 'rawBlock': {
      const obj: PortableTextObject = {
        _type: block.type.toLowerCase(),
        _key: keyGenerator(),
        ...block.attrs,
      }
      return [obj]
    }
  }
}

function isListContainer(type: string): boolean {
  return type === 'UL' || type === 'OL'
}

/**
 * Parse a textspec pattern (including its selection markers) and resolve
 * the selection against an actual PTE value. Use this to apply a
 * textspec-defined selection to an editor that already has content.
 *
 * The pattern must be a full textspec string matching the editor's content
 * (including blocks and marks), with `|` marking caret position or `^...|`
 * marking a range.
 *
 * The pattern's mark structure may differ from the PTE value's flat spans.
 * We resolve by computing the character offset within each block from the
 * pattern, then walking the PTE value to find the span at that offset.
 *
 * @public
 */
export function selectionFromTextspec(
  context: {
    schema: Schema
    containers?: TextspecContainers
  },
  pattern: string,
  value: Array<PortableTextBlock>,
): TextspecSelection {
  const state = parse(pattern)

  if (!state.selection) {
    return null
  }

  const position = rootPosition(context.schema, context.containers ?? new Map())
  const anchor = resolvePatternPoint(
    position,
    state.blocks,
    value,
    state.selection.anchor,
  )
  const focus = resolvePatternPoint(
    position,
    state.blocks,
    value,
    state.selection.focus,
  )

  if (!anchor || !focus) {
    return null
  }

  return {anchor, focus}
}

/**
 * The value's spans may be split differently from the pattern's marks, so
 * a point in a text block resolves through its block-local text offset.
 */
function resolvePatternPoint(
  position: TextspecPosition,
  patternBlocks: ReadonlyArray<TextspecBlock>,
  value: ReadonlyArray<unknown>,
  point: {path: Array<number>; offset: number},
): TextspecSelectionPoint | undefined {
  const notationPoint = locateNotationPoint(patternBlocks, point.path)
  const valueBlock = notationPoint
    ? resolveValuePath(position, value, notationPoint.blockPath)
    : undefined

  if (!notationPoint || !valueBlock) {
    return undefined
  }

  if (!notationPoint.textBlock) {
    return {path: valueBlock.path, offset: point.offset}
  }

  if (!isTextBlock({schema: valueBlock.position.schema}, valueBlock.node)) {
    return undefined
  }

  const textOffset = computeTextOffset(
    notationPoint.textBlock.children,
    notationPoint.inlinePath,
    point.offset,
  )

  if (textOffset === undefined) {
    return undefined
  }

  return locateSpanAtOffset(
    valueBlock.path,
    valueBlock.node.children,
    textOffset,
  )
}

/**
 * Map a notation path to the value's block indices. A UL/OL flattens into
 * one sibling block per item, so the value index of a notation block counts
 * the items of every list before it. `inlinePath` is the rest of the path
 * below a text block, in notation (mark-nested) indices.
 */
function locateNotationPoint(
  blocks: ReadonlyArray<TextspecBlock>,
  path: ReadonlyArray<number>,
):
  | {
      blockPath: Array<number>
      textBlock: TextBlock | undefined
      inlinePath: Array<number>
    }
  | undefined {
  const blockPath: Array<number> = []
  let siblings = blocks

  for (let depth = 0; depth < path.length; depth++) {
    const index = path[depth]
    const block = index === undefined ? undefined : siblings[index]

    if (index === undefined || !block) {
      return undefined
    }

    const valueIndex = siblings
      .slice(0, index)
      .reduce((count, sibling) => count + flatBlockCount(sibling), 0)
    const rest = path.slice(depth + 1)

    if (block.kind === 'containerBlock' && isListContainer(block.type)) {
      const items = listItems(block, 1)
      const itemIndex = items.findIndex((item) =>
        item.path.every((segment, i) => rest[i] === segment),
      )
      const item = items[itemIndex]

      if (!item) {
        return undefined
      }

      return {
        blockPath: [...blockPath, valueIndex + itemIndex],
        textBlock: item.block,
        inlinePath: rest.slice(item.path.length),
      }
    }

    blockPath.push(valueIndex)

    if (block.kind === 'textBlock') {
      return {blockPath, textBlock: block, inlinePath: rest}
    }

    if (block.kind !== 'containerBlock') {
      return {blockPath, textBlock: undefined, inlinePath: rest}
    }

    siblings = block.children
  }

  return {blockPath, textBlock: undefined, inlinePath: []}
}

function flatBlockCount(block: TextspecBlock): number {
  return block.kind === 'containerBlock' && isListContainer(block.type)
    ? listItems(block, 1).length
    : 1
}

/**
 * Keep in sync with `flattenInlineNode`, which emits one child per text and
 * inline object node and none for a mark, so a notation inline path maps to
 * the number of those leaves before it. A path into an empty mark lands on
 * the next leaf.
 */
function inlineLeafIndex(
  children: ReadonlyArray<InlineNode>,
  path: ReadonlyArray<number>,
): number {
  const [index, ...rest] = path

  if (index === undefined) {
    return 0
  }

  const before = children
    .slice(0, index)
    .reduce((count, child) => count + countInlineLeaves(child), 0)
  const node = children[index]

  return node?.kind === 'mark'
    ? before + inlineLeafIndex(node.children, rest)
    : before
}

function countInlineLeaves(node: InlineNode): number {
  return node.kind === 'mark'
    ? node.children.reduce(
        (count, child) => count + countInlineLeaves(child),
        0,
      )
    : 1
}

function resolveValuePath(
  rootPosition: TextspecPosition,
  value: ReadonlyArray<unknown>,
  blockPath: ReadonlyArray<number>,
):
  | {
      path: Array<TextspecSelectionPoint['path'][number]>
      node: Record<string, unknown>
      position: TextspecPosition
    }
  | undefined {
  const path: Array<TextspecSelectionPoint['path'][number]> = []
  let position = rootPosition
  let siblings = value
  let node: Record<string, unknown> | undefined

  for (const index of blockPath) {
    if (node) {
      const child = childArrayField(position, node)
      const field = child ? node[child.name] : undefined

      if (!child || !Array.isArray(field)) {
        return undefined
      }

      path.push(child.name)
      position = child.position
      siblings = field
    }

    const next = siblings[index]

    if (!isTypedObject(next) || typeof next['_key'] !== 'string') {
      return undefined
    }

    path.push({_key: next['_key']})
    node = next
  }

  return node ? {path, node, position} : undefined
}

/**
 * Sum text lengths up to the point's leaf, using the parse tree's children.
 * The path walks down the parse tree (including mark nodes). The final
 * offset is added to reach the character offset within the block.
 */
function computeTextOffset(
  children: ReadonlyArray<Record<string, unknown>> | ReadonlyArray<unknown>,
  path: Array<number>,
  leafOffset: number,
): number | undefined {
  let offset = 0
  let currentChildren = children as ReadonlyArray<Record<string, unknown>>

  for (let i = 0; i < path.length; i++) {
    const index = path[i]

    if (typeof index !== 'number') {
      return undefined
    }

    // Empty children: pattern block is empty (e.g. `B: `). Treat the point
    // as the start of the block. PTE normalizes empty blocks with a single
    // placeholder span at offset 0.
    if (currentChildren.length === 0) {
      return offset
    }

    for (let j = 0; j < index; j++) {
      offset += measureNodeText(currentChildren[j])
    }

    const node = currentChildren[index]

    if (!node) {
      return undefined
    }

    if (node['kind'] === 'text') {
      return offset + leafOffset
    }

    const nextChildren = node['children']

    if (Array.isArray(nextChildren)) {
      currentChildren = nextChildren as ReadonlyArray<Record<string, unknown>>
      continue
    }

    return undefined
  }

  return offset + leafOffset
}

function measureNodeText(node: Record<string, unknown> | undefined): number {
  if (!node) {
    return 0
  }

  if (node['kind'] === 'text' && typeof node['text'] === 'string') {
    return node['text'].length
  }

  const children = node['children']

  if (!Array.isArray(children)) {
    return 0
  }

  let total = 0
  for (const child of children) {
    total += measureNodeText(child as Record<string, unknown>)
  }
  return total
}

/**
 * Walk a PTE text block's flat children to find the span at the given
 * character offset. Returns a keyed selection point on that span.
 */
function locateSpanAtOffset(
  blockPath: TextspecSelectionPoint['path'],
  children: PortableTextTextBlock['children'],
  textOffset: number,
): TextspecSelectionPoint | undefined {
  // Empty text block in PTE always has at least one placeholder span after
  // normalization. If there are no spans yet, the block is still being set
  // up — bail out so the caller can retry.
  if (children.length === 0) {
    return undefined
  }

  let remaining = textOffset

  for (const child of children) {
    const spanKey = child._key

    if (typeof spanKey !== 'string') {
      continue
    }

    const text = typeof child.text === 'string' ? child.text : ''

    if (remaining <= text.length) {
      return {
        path: [...blockPath, 'children', {_key: spanKey}],
        offset: remaining,
      }
    }

    remaining -= text.length
  }

  // Offset overflows: place at end of last span if possible.
  const last = children[children.length - 1]
  const lastKey = last?._key
  const lastText = typeof last?.text === 'string' ? last.text : ''

  if (typeof lastKey === 'string') {
    return {
      path: [...blockPath, 'children', {_key: lastKey}],
      offset: lastText.length,
    }
  }

  return undefined
}

function convertSelectionToPTE(
  position: TextspecPosition,
  notationBlocks: ReadonlyArray<TextspecBlock>,
  blocks: Array<PortableTextBlock>,
  state: {
    selection: {
      anchor: {path: Array<number>; offset: number}
      focus: {path: Array<number>; offset: number}
    } | null
  },
): TextspecSelection {
  if (!state.selection) {
    return null
  }

  const anchor = resolveConvertedPoint(
    position,
    notationBlocks,
    blocks,
    state.selection.anchor,
  )
  const focus = resolveConvertedPoint(
    position,
    notationBlocks,
    blocks,
    state.selection.focus,
  )

  if (!anchor || !focus) {
    return null
  }

  // Textspec represents a selected block object as a range from offset 0
  // to offset 1. PTE represents it as a collapsed selection at offset 0.
  if (
    anchor.blockObject &&
    anchor.point.offset === 0 &&
    focus.point.offset === 1 &&
    isEqualPaths(anchor.point.path, focus.point.path)
  ) {
    return {anchor: anchor.point, focus: {...focus.point, offset: 0}}
  }

  return {anchor: anchor.point, focus: focus.point}
}

function resolveConvertedPoint(
  position: TextspecPosition,
  notationBlocks: ReadonlyArray<TextspecBlock>,
  blocks: Array<PortableTextBlock>,
  point: {path: Array<number>; offset: number},
): {point: TextspecSelectionPoint; blockObject: boolean} | undefined {
  const notationPoint = locateNotationPoint(notationBlocks, point.path)
  const valueBlock = notationPoint
    ? resolveValuePath(position, blocks, notationPoint.blockPath)
    : undefined

  if (!notationPoint || !valueBlock) {
    return undefined
  }

  const textBlock = isTextBlock(
    {schema: valueBlock.position.schema},
    valueBlock.node,
  )
    ? valueBlock.node
    : undefined

  if (!notationPoint.textBlock || !textBlock) {
    return {
      point: {path: valueBlock.path, offset: point.offset},
      blockObject: !textBlock,
    }
  }

  const child =
    textBlock.children[
      inlineLeafIndex(
        notationPoint.textBlock.children,
        notationPoint.inlinePath,
      )
    ]

  if (!child) {
    return undefined
  }

  return {
    point: {
      path: [...valueBlock.path, 'children', {_key: child._key}],
      offset: point.offset,
    },
    blockObject: false,
  }
}

function isEqualPaths(
  a: TextspecSelectionPoint['path'],
  b: TextspecSelectionPoint['path'],
): boolean {
  return (
    a.length === b.length &&
    a.every((segment, index) => {
      const other = b[index]
      return isKeyedSegment(segment) && isKeyedSegment(other)
        ? segment._key === other._key
        : segment === other
    })
  )
}

function isKeyedSegment(segment: unknown): segment is {_key: string} {
  return typeof segment === 'object' && segment !== null && '_key' in segment
}
