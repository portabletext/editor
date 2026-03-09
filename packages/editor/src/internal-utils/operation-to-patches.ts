import {
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import {
  isSpan,
  isTextBlock,
  type PortableTextBlock,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import {
  Element,
  type Descendant,
  type InsertNodeOperation,
  type InsertTextOperation,
  type RemoveNodeOperation,
  type RemoveTextOperation,
  type SetNodeOperation,
} from '../slate'
import type {Path} from '../types/paths'
import {type KeyPath, resolveKeyPath} from './resolve-key-path'

function withTextField(keyPath: KeyPath): Path {
  return [...keyPath, 'text']
}

function withProperty(keyPath: KeyPath, property: string): Path {
  return [...keyPath, property]
}

export function insertTextPatch(
  schema: EditorSchema,
  children: Descendant[],
  operation: InsertTextOperation,
  beforeValue: Array<PortableTextBlock>,
): Array<Patch> {
  const keyPath = resolveKeyPath(
    schema,
    children as Array<PortableTextBlock>,
    operation.path,
  )
  if (!keyPath || keyPath.length < 3) {
    return []
  }

  const block = children[operation.path[0]!]
  if (!block || !isTextBlock({schema}, block)) {
    return []
  }
  const child = block.children[operation.path[1]!]
  if (!child || !isSpan({schema}, child)) {
    throw new Error('Could not find child')
  }

  const prevBlock = beforeValue[operation.path[0]!]
  const prevChild =
    isTextBlock({schema}, prevBlock) && prevBlock.children[operation.path[1]!]
  const prevText = isSpan({schema}, prevChild) ? prevChild.text : ''

  const patch = diffMatchPatch(prevText, child.text, withTextField(keyPath))
  return patch.value.length ? [patch] : []
}

export function removeTextPatch(
  schema: EditorSchema,
  children: Descendant[],
  operation: RemoveTextOperation,
  beforeValue: Array<PortableTextBlock>,
): Array<Patch> {
  const keyPath = resolveKeyPath(
    schema,
    children as Array<PortableTextBlock>,
    operation.path,
  )
  if (!keyPath || keyPath.length < 3) {
    return []
  }

  const block = children[operation.path[0]!]
  if (!block || !isTextBlock({schema}, block)) {
    return []
  }
  const child = block.children[operation.path[1]!]
  if (!child) {
    throw new Error('Could not find child')
  }
  if (!isSpan({schema}, child)) {
    throw new Error('Expected span')
  }

  const beforeBlock = beforeValue[operation.path[0]!]
  const prevChild =
    isTextBlock({schema}, beforeBlock) &&
    beforeBlock.children[operation.path[1]!]
  const prevText = isSpan({schema}, prevChild) ? prevChild.text : ''

  const patch = diffMatchPatch(prevText, child.text, withTextField(keyPath))
  return patch.value ? [patch] : []
}

export function setNodePatch(
  schema: EditorSchema,
  children: Descendant[],
  operation: SetNodeOperation,
): Array<Patch> {
  if (operation.path.length === 1) {
    return setBlockNodePatch(schema, children, operation)
  }

  if (operation.path.length === 2) {
    return setChildNodePatch(schema, children, operation)
  }

  throw new Error(
    `Unexpected path encountered: ${JSON.stringify(operation.path)}`,
  )
}

function setBlockNodePatch(
  schema: EditorSchema,
  children: Descendant[],
  operation: SetNodeOperation,
): Array<Patch> {
  const blockIndex = operation.path[0]!
  const keyPath = resolveKeyPath(
    schema,
    children as Array<PortableTextBlock>,
    operation.path,
  )

  if (!keyPath) {
    console.error('Could not find block at index', blockIndex)
    return []
  }

  const block = children[blockIndex]!
  const skipChildren = !isTextBlock({schema}, block)
  const patches: Patch[] = []

  for (const [key, value] of Object.entries(operation.newProperties)) {
    if (key === '_key') {
      patches.push(set(value, [blockIndex, '_key']))
    } else if (!skipChildren || key !== 'children') {
      patches.push(set(value, withProperty(keyPath, key)))
    }
  }

  for (const key of Object.keys(operation.properties)) {
    if (key === '_key' || (skipChildren && key === 'children')) {
      continue
    }
    if (!(key in operation.newProperties)) {
      patches.push(unset(withProperty(keyPath, key)))
    }
  }

  return patches
}

function setChildNodePatch(
  schema: EditorSchema,
  children: Descendant[],
  operation: SetNodeOperation,
): Array<Patch> {
  const keyPath = resolveKeyPath(
    schema,
    children as Array<PortableTextBlock>,
    operation.path,
  )

  if (!keyPath) {
    throw new Error('Could not find a valid block or child')
  }

  const block = children[operation.path[0]!]
  if (!isTextBlock({schema}, block)) {
    throw new Error('Could not find a valid block')
  }

  const child = block.children[operation.path[1]!]
  if (!child) {
    throw new Error('Could not find a valid child')
  }

  const childIndex = block.children.indexOf(child)
  const blockKey = block._key
  const isElement = Element.isElement(child, schema)
  const patches: Patch[] = []

  for (const [key, value] of Object.entries(operation.newProperties)) {
    if (key === '_key') {
      patches.push(
        set(value, [{_key: blockKey}, 'children', childIndex, '_key']),
      )
    } else if (!isElement || key !== 'children') {
      patches.push(set(value, withProperty(keyPath, key)))
    }
  }

  if (!isElement) {
    for (const key of Object.keys(operation.properties)) {
      if (!(key in operation.newProperties)) {
        patches.push(unset(withProperty(keyPath, key)))
      }
    }
  }

  return patches
}

export function insertNodePatch(
  schema: EditorSchema,
  children: Descendant[],
  operation: InsertNodeOperation,
  beforeValue: Array<PortableTextBlock>,
): Array<Patch> {
  if (operation.path.length === 1) {
    return insertBlockNodePatch(schema, operation, beforeValue)
  }

  const block = beforeValue[operation.path[0]!]

  if (
    isTextBlock({schema}, block) &&
    operation.path.length === 2 &&
    children[operation.path[0]!]
  ) {
    return insertChildNodePatch(operation, block)
  }

  return []
}

function insertBlockNodePatch(
  schema: EditorSchema,
  operation: InsertNodeOperation,
  beforeValue: Array<PortableTextBlock>,
): Array<Patch> {
  const insertIdx = operation.path[0]!
  const position = insertIdx === 0 ? 'before' : 'after'
  const adjacentIdx = insertIdx === 0 ? 0 : insertIdx - 1
  const adjacentKeyPath = resolveKeyPath(schema, beforeValue, [adjacentIdx])

  if (adjacentKeyPath) {
    return [
      insert(
        [operation.node as PortableTextBlock],
        position,
        adjacentKeyPath as Path,
      ),
    ]
  }

  return [
    setIfMissing(beforeValue, []),
    insert([operation.node as PortableTextBlock], 'before', [insertIdx]),
  ]
}

function insertChildNodePatch(
  operation: InsertNodeOperation,
  block: PortableTextTextBlock,
): Array<Patch> {
  const childIdx = operation.path[1]!
  const prevChild = block.children[childIdx - 1]
  const position =
    block.children.length === 0 || !prevChild ? 'before' : 'after'
  const path: Path =
    block.children.length <= 1 || !prevChild
      ? [{_key: block._key}, 'children', 0]
      : [{_key: block._key}, 'children', {_key: prevChild._key}]

  return [
    setIfMissing([], [{_key: block._key}, 'children']),
    insert([operation.node], position, path),
  ]
}

export function removeNodePatch(
  schema: EditorSchema,
  beforeValue: Array<PortableTextBlock>,
  operation: RemoveNodeOperation,
): Array<Patch> {
  const block = beforeValue[operation.path[0]!]

  if (operation.path.length === 1) {
    const keyPath = resolveKeyPath(schema, beforeValue, operation.path)
    if (!keyPath) {
      throw new Error('Block not found')
    }
    return [unset(keyPath as Path)]
  }

  if (!isTextBlock({schema}, block) || operation.path.length !== 2) {
    return []
  }

  const child = block.children[operation.path[1]!]
  if (!child) {
    return []
  }

  const duplicates = block.children.filter(
    (span) => span._key === operation.node._key,
  )
  if (duplicates.length > 1) {
    console.warn(
      `Multiple spans have \`_key\` ${operation.node._key}. It's ambiguous which one to remove.`,
      JSON.stringify(block, null, 2),
    )
    return []
  }

  const keyPath = resolveKeyPath(schema, beforeValue, operation.path)
  if (!keyPath) {
    return []
  }

  return [unset(keyPath as Path)]
}
