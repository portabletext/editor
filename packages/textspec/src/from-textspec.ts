import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
  Schema,
} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import {parse} from '@textspec/notation'
import type {
  Block,
  ContainerBlock,
  InlineNode,
  TextBlock,
} from '@textspec/notation'

/**
 * Selection types structurally compatible with PTE's EditorSelection.
 * Defined locally to avoid depending on @portabletext/editor (which requires React).
 */
interface SelectionPoint {
  path: Array<{_key: string} | string | number>
  offset: number
}

interface SelectionValue {
  anchor: SelectionPoint
  focus: SelectionPoint
  backward?: boolean
}

function blockTypeToStyle(type: string): string {
  switch (type) {
    case 'P':
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
        const markDef: PortableTextObject = {
          _type: node.type,
          _key: markId,
        }
        if (node.attrs) {
          for (const [key, value] of Object.entries(node.attrs)) {
            markDef[key] = value
          }
        }
        markDefs.push(markDef)
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
      const obj: PortableTextObject = {
        _type: node.type,
        _key: keyGenerator(),
      }
      if (node.attrs) {
        for (const [key, value] of Object.entries(node.attrs)) {
          obj[key] = value
        }
      }
      return [obj]
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
): PortableTextTextBlock {
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
    _key: keyGenerator(),
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
  block: Block,
  keyGenerator: () => string,
): Array<PortableTextBlock> {
  switch (block.kind) {
    case 'textBlock': {
      return [
        convertTextBlockToPTE(
          schema,
          block,
          keyGenerator,
          blockTypeToStyle(block.type),
        ),
      ]
    }

    case 'containerBlock': {
      return flattenContainer(schema, block, keyGenerator, 1)
    }

    case 'blockObject': {
      const obj: PortableTextObject = {
        _type: block.type.toLowerCase(),
        _key: keyGenerator(),
      }
      if (block.attrs) {
        for (const [key, value] of Object.entries(block.attrs)) {
          obj[key] = value
        }
      }
      return [obj]
    }

    case 'rawBlock': {
      // Raw blocks (CODE!, MATH!) - treat as block objects for now
      const obj: PortableTextObject = {
        _type: block.type.toLowerCase(),
        _key: keyGenerator(),
      }
      if (block.attrs) {
        for (const [key, value] of Object.entries(block.attrs)) {
          obj[key] = value
        }
      }
      return [obj]
    }
  }
}

/**
 * Convert textspec index-based selection to PTE key-based selection.
 */
function convertSelectionToPTE(
  schema: Schema,
  blocks: Array<PortableTextBlock>,
  state: {
    selection: {
      anchor: {path: Array<number>; offset: number}
      focus: {path: Array<number>; offset: number}
    } | null
  },
): SelectionValue | null {
  if (!state.selection) return null

  const anchor = resolvePointToPTE(schema, blocks, state.selection.anchor)
  const focus = resolvePointToPTE(schema, blocks, state.selection.focus)

  if (!anchor || !focus) return null

  return {anchor, focus}
}

function resolvePointToPTE(
  schema: Schema,
  blocks: Array<PortableTextBlock>,
  point: {path: Array<number>; offset: number},
): SelectionPoint | undefined {
  const blockIndex = point.path[0]
  const childIndex = point.path[1]

  if (blockIndex === undefined || childIndex === undefined) return undefined

  const block = blocks[blockIndex]
  if (!block) return undefined

  // Use type guard to narrow to text block
  const ctx = {schema}
  if (!isTextBlock(ctx, block)) return undefined

  const child = block.children[childIndex]
  if (!child || !('_key' in child)) return undefined

  return {
    path: [{_key: block._key}, 'children', {_key: child._key}],
    offset: point.offset,
  }
}

/**
 * Parse a textspec notation string into PTE blocks and selection.
 *
 * @public
 */
export function fromTextspec(
  context: {
    schema: Schema
    keyGenerator: () => string
  },
  textspec: string,
): {
  blocks: Array<PortableTextBlock>
  selection: SelectionValue | null
} {
  const state = parse(textspec)
  const blocks: Array<PortableTextBlock> = []

  for (const block of state.blocks) {
    const pteBlocks = convertBlockToPTE(
      context.schema,
      block,
      context.keyGenerator,
    )
    for (const pteBlock of pteBlocks) {
      blocks.push(pteBlock)
    }
  }

  const selection = convertSelectionToPTE(context.schema, blocks, state)

  return {blocks, selection}
}
