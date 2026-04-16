import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
  Schema,
} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import type {
  Block,
  ContainerBlock,
  InlineNode,
  TextBlock,
  Block as TextspecBlock,
} from '@textspec/notation'
import {parse} from '@textspec/notation'
import type {Containers} from '../src/schema/resolve-containers'
import type {EditorSelection, EditorSelectionPoint} from '../src/types/editor'

/**
 * Parse a textspec notation string into PTE blocks and selection.
 */
export function fromTextspec(
  context: {
    schema: Schema
    keyGenerator: () => string
    containers?: Containers
  },
  textspec: string,
): {
  blocks: Array<PortableTextBlock>
  selection: EditorSelection
} {
  // If no selection markers are present, add a cursor at the end
  // to satisfy the parser's requirement for a selection marker.
  const hasSelection = /(?<!\\)[|^]/.test(textspec)
  const input = hasSelection ? textspec : `${textspec}|`
  const state = parse(input)
  const containers = context.containers ?? new Map()
  const blocks: Array<PortableTextBlock> = []

  for (const block of state.blocks) {
    const pteBlocks = convertBlockToPTE(
      context.schema,
      containers,
      block,
      context.keyGenerator,
      '',
    )
    for (const pteBlock of pteBlocks) {
      blocks.push(pteBlock)
    }
  }

  const selection = convertSelectionToPTE(
    context.schema,
    containers,
    blocks,
    state,
  )

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
          _type: 'span',
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
        // Annotation or overlay: create a markDef
        markId = keyGenerator()
        markDefs.push({
          _type: node.type,
          _key: markId,
          ...node.attrs,
        })
      }

      const childMarks = [...parentMarks, markId]
      const results: Array<PortableTextSpan | PortableTextObject> = []

      for (const child of node.children) {
        const flattened = flattenInlineNode(
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
    const flattened = flattenInlineNode(child, keyGenerator, [], markDefs)
    for (const item of flattened) {
      children.push(item)
    }
  }

  const result: PortableTextTextBlock = {
    _type: schema.block.name,
    _key: blockKey,
    children,
    ...(markDefs.length > 0 ? {markDefs} : {}),
    style,
    ...(listItem ? {listItem} : {}),
    ...(level ? {level} : {}),
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
  level: number,
): Array<PortableTextTextBlock> {
  const listItem = containerTypeToListItem(container.type)
  const results: Array<PortableTextTextBlock> = []

  for (const child of container.children) {
    if (child.kind === 'textBlock' && child.type === 'LI') {
      // Simple LI: LI is a text block directly (e.g., "LI: text")
      results.push(
        convertTextBlockToPTE(
          schema,
          child,
          keyGenerator,
          'normal',
          listItem,
          level,
        ),
      )
    } else if (child.kind === 'containerBlock' && child.type === 'LI') {
      // LI container: can contain a text block and/or nested containers
      for (const liChild of child.children) {
        if (liChild.kind === 'textBlock') {
          results.push(
            convertTextBlockToPTE(
              schema,
              liChild,
              keyGenerator,
              blockTypeToStyle(liChild.type),
              listItem,
              level,
            ),
          )
        } else if (liChild.kind === 'containerBlock') {
          // Nested list
          const nested = flattenContainer(
            schema,
            liChild,
            keyGenerator,
            level + 1,
          )
          for (const nestedBlock of nested) {
            results.push(nestedBlock)
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
  schema: Schema,
  containers: Containers,
  block: Block,
  keyGenerator: () => string,
  scopePath: string,
): Array<PortableTextBlock> {
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

      const explicitKey =
        block.attrs && typeof block.attrs['_key'] === 'string'
          ? block.attrs['_key']
          : undefined

      return [
        convertTextBlockToPTE(
          schema,
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
        return flattenContainer(schema, block, keyGenerator, 1)
      }

      const resolvedScopePath = resolveContainerScopePath(
        containers,
        scopePath,
        block.type,
      )

      if (resolvedScopePath) {
        return [
          convertContainerToPTE(
            schema,
            containers,
            block,
            keyGenerator,
            resolvedScopePath,
          ),
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
 * Resolve the scope path for a container block type.
 *
 * For root-level containers, finds the matching key in the containers map
 * by comparing uppercased type names.
 *
 * For nested containers, looks through the parent container's `of` array
 * to find a member whose uppercased type matches the textspec type,
 * then builds the scoped name.
 */
function resolveContainerScopePath(
  containers: Containers,
  parentScopePath: string,
  textspecType: string,
): string | undefined {
  if (parentScopePath === '') {
    // Root-level: find a container key whose uppercased form matches
    for (const key of containers.keys()) {
      // Root-level keys have no dots
      if (!key.includes('.') && key.toUpperCase() === textspecType) {
        return key
      }
    }
    return undefined
  }

  // Nested: look through parent container's `of` array
  const parentField = containers.get(parentScopePath)

  if (!parentField) {
    return undefined
  }

  for (const ofMember of parentField.of) {
    const memberType = ofMember.name ?? ofMember.type
    if (memberType.toUpperCase() === textspecType) {
      const childScopePath = `${parentScopePath}.${memberType}`
      if (containers.has(childScopePath)) {
        return childScopePath
      }
    }
  }

  return undefined
}

function convertContainerToPTE(
  schema: Schema,
  containers: Containers,
  container: ContainerBlock,
  keyGenerator: () => string,
  scopePath: string,
): PortableTextObject {
  const containerField = containers.get(scopePath)

  if (!containerField) {
    return {
      _type: container.type.toLowerCase(),
      _key: keyGenerator(),
    }
  }

  // Extract the actual PTE type name from the scope path
  // (last segment for nested, full path for root)
  const segments = scopePath.split('.')
  const typeName = segments[segments.length - 1]!

  const items: Array<PortableTextBlock> = []

  for (const child of container.children) {
    const pteBlocks = convertBlockToPTE(
      schema,
      containers,
      child,
      keyGenerator,
      scopePath,
    )
    for (const pteBlock of pteBlocks) {
      items.push(pteBlock)
    }
  }

  return {
    _type: typeName,
    _key: keyGenerator(),
    [containerField.name]: items,
  }
}

/**
 * Parse a textspec pattern (including its selection markers) and resolve
 * the selection against an actual PTE value. Use this to apply a
 * textspec-defined selection to an editor that already has content.
 *
 * The pattern is a full textspec string (matching the editor's content)
 * with `|` marking caret position or `^...|` marking a range.
 */
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
 */
export function selectionFromTextspec(
  context: {
    schema: Schema
    containers?: Containers
  },
  pattern: string,
  value: Array<PortableTextBlock>,
): EditorSelection {
  const state = parse(pattern)

  if (!state.selection) {
    return null
  }

  const schemaContext = {schema: context.schema}
  const containers = context.containers ?? new Map()

  const anchor = resolveIndexedPoint(
    schemaContext,
    containers,
    state.blocks,
    value,
    state.selection.anchor,
  )
  const focus = resolveIndexedPoint(
    schemaContext,
    containers,
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
 * Resolve an indexed point from the textspec parse tree to a keyed point
 * against the PTE value. For text blocks, flattens the pattern's marks to
 * compute a block-local character offset, then walks the PTE block's flat
 * spans to find the span and offset.
 */
function resolveIndexedPoint(
  schemaContext: {schema: Schema},
  containers: Containers,
  patternBlocks: ReadonlyArray<TextspecBlock>,
  value: Array<PortableTextBlock>,
  point: {path: Array<number>; offset: number},
): EditorSelectionPoint | undefined {
  const [blockIndex, ...rest] = point.path

  if (typeof blockIndex !== 'number') {
    return undefined
  }

  const patternBlock = patternBlocks[blockIndex]
  const valueBlock = value[blockIndex] as Record<string, unknown> | undefined

  if (!patternBlock || !valueBlock) {
    return undefined
  }

  const valueKey =
    typeof valueBlock['_key'] === 'string' ? valueBlock['_key'] : undefined

  if (!valueKey) {
    return undefined
  }

  if (patternBlock.kind === 'textBlock') {
    if (!isTextBlock(schemaContext, valueBlock as PortableTextBlock)) {
      return undefined
    }

    const textOffset = computeTextOffset(
      patternBlock.children,
      rest,
      point.offset,
    )

    if (textOffset === undefined) {
      return undefined
    }

    return locateSpanAtOffset(
      valueKey,
      (valueBlock['children'] ?? []) as Array<Record<string, unknown>>,
      textOffset,
    )
  }

  // Non-text block (container or void). Walk by index.
  return resolveContainerPoint(
    schemaContext,
    containers,
    valueBlock,
    rest,
    point.offset,
  )
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
  blockKey: string,
  children: Array<Record<string, unknown>>,
  textOffset: number,
): EditorSelectionPoint | undefined {
  // Empty text block in PTE always has at least one placeholder span after
  // normalization. If there are no spans yet, the block is still being set
  // up — bail out so the caller can retry.
  if (children.length === 0) {
    return undefined
  }

  let remaining = textOffset

  for (const child of children) {
    const spanKey = child['_key']

    if (typeof spanKey !== 'string') {
      continue
    }

    const text = typeof child['text'] === 'string' ? child['text'] : ''

    if (remaining <= text.length) {
      return {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: remaining,
      }
    }

    remaining -= text.length
  }

  // Offset overflows: place at end of last span if possible.
  const last = children[children.length - 1]
  const lastKey = last ? last['_key'] : undefined
  const lastText = last && typeof last['text'] === 'string' ? last['text'] : ''

  if (typeof lastKey === 'string') {
    return {
      path: [{_key: blockKey}, 'children', {_key: lastKey}],
      offset: lastText.length,
    }
  }

  return undefined
}

/**
 * Resolve a point inside a container or void block by walking indices.
 */
function resolveContainerPoint(
  schemaContext: {schema: Schema},
  containers: Containers,
  block: Record<string, unknown>,
  path: Array<number>,
  leafOffset: number,
): EditorSelectionPoint | undefined {
  const keyedPath: EditorSelectionPoint['path'] = []
  const blockKey = block['_key']

  if (typeof blockKey !== 'string') {
    return undefined
  }

  keyedPath.push({_key: blockKey})

  let currentNode: Record<string, unknown> = block

  for (const index of path) {
    let childFieldName: string | undefined

    if (isTextBlock(schemaContext, currentNode as PortableTextBlock)) {
      childFieldName = 'children'
    } else if (typeof currentNode['_type'] === 'string') {
      for (const [, containerField] of containers) {
        if (currentNode[containerField.name] !== undefined) {
          childFieldName = containerField.name
          break
        }
      }
    }

    if (!childFieldName) {
      break
    }

    const field = currentNode[childFieldName]

    if (!Array.isArray(field)) {
      return undefined
    }

    keyedPath.push(childFieldName)

    const child = field[index] as Record<string, unknown> | undefined

    if (!child || typeof child['_key'] !== 'string') {
      return undefined
    }

    keyedPath.push({_key: child['_key']})
    currentNode = child
  }

  return {path: keyedPath, offset: leafOffset}
}

function convertSelectionToPTE(
  schema: Schema,
  containers: Containers,
  blocks: Array<PortableTextBlock>,
  state: {
    selection: {
      anchor: {path: Array<number>; offset: number}
      focus: {path: Array<number>; offset: number}
    } | null
  },
): EditorSelection {
  if (!state.selection) {
    return null
  }

  const anchor = resolvePointToPTE(
    schema,
    containers,
    blocks,
    state.selection.anchor,
  )
  const focus = resolvePointToPTE(
    schema,
    containers,
    blocks,
    state.selection.focus,
  )

  if (!anchor || !focus) {
    return null
  }

  return {anchor, focus}
}

function resolvePointToPTE(
  schema: Schema,
  containers: Containers,
  blocks: Array<PortableTextBlock>,
  point: {path: Array<number>; offset: number},
): EditorSelectionPoint | undefined {
  const keyedPath = indexedPathToKeyedPath(
    point.path,
    schema,
    containers,
    blocks as Array<Record<string, unknown>>,
  )

  if (!keyedPath) {
    return undefined
  }

  return {path: keyedPath, offset: point.offset}
}

function indexedPathToKeyedPath(
  indexedPath: Array<number>,
  schema: Schema,
  containers: Containers,
  children: Array<Record<string, unknown>>,
): EditorSelectionPoint['path'] | undefined {
  const schemaContext = {schema}
  const keyedPath: EditorSelectionPoint['path'] = []
  let currentChildren = children

  for (const index of indexedPath) {
    const node = currentChildren[index]

    if (!node || !('_key' in node) || typeof node['_key'] !== 'string') {
      return undefined
    }

    keyedPath.push({_key: node['_key']})

    let childFieldName: string | undefined

    if (isTextBlock(schemaContext, node as PortableTextBlock)) {
      childFieldName = 'children'
    } else if (typeof node['_type'] === 'string') {
      // Look up the field name from the containers map
      for (const [, containerField] of containers) {
        if (node[containerField.name] !== undefined) {
          childFieldName = containerField.name
          break
        }
      }
    }

    if (childFieldName) {
      const field = node[childFieldName]

      if (Array.isArray(field)) {
        keyedPath.push(childFieldName)
        currentChildren = field as Array<Record<string, unknown>>
      }
    } else {
      // Leaf node (e.g., span). Remaining indices are mark nesting depth
      // from the textspec parser and should be ignored since PTE uses
      // flat marks.
      break
    }
  }

  return keyedPath
}
