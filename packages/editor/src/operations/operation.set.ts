import type {PortableTextTextBlock} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import {applySetNode} from '../internal-utils/apply-set-node'
import {safeStringify} from '../internal-utils/safe-json'
import {parseMarkDefs} from '../utils/parse-blocks'
import type {OperationImplementation} from './operation.types'

export const setOperationImplementation: OperationImplementation<'set'> = ({
  context,
  operation,
}) => {
  const path = operation.at

  if (path.length === 0) {
    throw new Error('Cannot set properties on the root editor node')
  }

  const firstSegment = path[0]

  if (typeof firstSegment !== 'object' || !('_key' in firstSegment)) {
    throw new Error(
      `Expected keyed segment at path[0], got ${safeStringify(firstSegment)}`,
    )
  }

  const blockIndex = operation.editor.blockIndexMap.get(firstSegment._key)

  if (blockIndex === undefined) {
    throw new Error(
      `Unable to find block index for block at ${safeStringify(path)}`,
    )
  }

  const block = operation.editor.children.at(blockIndex)

  if (!block) {
    throw new Error(`Unable to find block at ${safeStringify(path)}`)
  }

  // Block-level set
  if (path.length === 1) {
    setAtBlock({
      context,
      operation,
      block: block as Record<string, unknown>,
      blockIndex,
    })
    return
  }

  // Child-level set on text blocks (spans need Slate-level text operations)
  if (
    path.length === 3 &&
    path[1] === 'children' &&
    isTextBlock(context, block)
  ) {
    setAtChild({context, operation, block, blockIndex})
    return
  }

  // Deep path — apply set_node at the deep PTE path directly.
  // modifyDescendant handles PTE path segments (field names, keyed segments).
  applySetNode(operation.editor, operation.value, path)
}

function setAtBlock({
  context,
  operation,
  block,
  blockIndex,
}: {
  context: Parameters<OperationImplementation<'set'>>[0]['context']
  operation: Parameters<OperationImplementation<'set'>>[0]['operation']
  block: Record<string, unknown>
  blockIndex: number
}) {
  if (isTextBlock(context, block)) {
    applySetNode(
      operation.editor,
      filterTextBlockValue({context, value: operation.value}),
      [blockIndex],
    )
    return
  }

  if (operation.editor.isObjectNode(block)) {
    const definition = context.schema.blockObjects.find(
      (d) => d.name === block['_type'],
    )

    if (!definition) {
      throw new Error(
        `Unable to find schema definition for object type ${block['_type']}`,
      )
    }

    const {_type, _key, ...rest} = operation.value

    for (const prop in rest) {
      if (!definition.fields.some((field) => field.name === prop)) {
        delete rest[prop]
      }
    }

    applySetNode(
      operation.editor,
      {
        ...block,
        _key: typeof _key === 'string' ? _key : block['_key'],
        ...rest,
      },
      [blockIndex],
    )

    return
  }

  applySetNode(operation.editor, {...block, ...operation.value}, [blockIndex])
}

function setAtChild({
  context,
  operation,
  block,
  blockIndex,
}: {
  context: Parameters<OperationImplementation<'set'>>[0]['context']
  operation: Parameters<OperationImplementation<'set'>>[0]['operation']
  block: PortableTextTextBlock
  blockIndex: number
}) {
  const childSegment = operation.at[2]

  if (typeof childSegment !== 'object' || !('_key' in childSegment)) {
    return
  }

  const childIndex = block.children.findIndex(
    (c) => c._key === childSegment._key,
  )

  if (childIndex === -1) {
    return
  }

  const child = block.children[childIndex]!
  const childPath = [blockIndex, childIndex]

  if (operation.editor.isTextSpan(child)) {
    const {_type, text, ...rest} = operation.value

    applySetNode(operation.editor, {...child, ...rest}, childPath)

    if (typeof text === 'string' && text !== child.text) {
      operation.editor.apply({
        type: 'remove_text',
        path: childPath,
        offset: 0,
        text: child.text,
      })

      operation.editor.apply({
        type: 'insert_text',
        path: childPath,
        offset: 0,
        text,
      })
    }

    return
  }

  if (operation.editor.isObjectNode(child)) {
    const definition = context.schema.inlineObjects.find(
      (d) => d.name === child._type,
    )

    if (!definition) {
      return
    }

    const {_type, _key, ...rest} = operation.value

    for (const prop in rest) {
      if (!definition.fields.some((field) => field.name === prop)) {
        delete rest[prop]
      }
    }

    applySetNode(
      operation.editor,
      {
        ...child,
        _key: typeof _key === 'string' ? _key : child._key,
        ...rest,
      },
      childPath,
    )
  }
}

function filterTextBlockValue({
  context,
  value,
}: {
  context: Parameters<OperationImplementation<'set'>>[0]['context']
  value: Record<string, unknown>
}): Record<string, unknown> {
  const filteredProps: Record<string, unknown> = {}

  for (const key of Object.keys(value)) {
    if (key === '_type' || key === 'children') {
      continue
    }

    if (key === 'style') {
      if (context.schema.styles.some((style) => style.name === value[key])) {
        filteredProps[key] = value[key]
      }
      continue
    }

    if (key === 'listItem') {
      if (context.schema.lists.some((list) => list.name === value[key])) {
        filteredProps[key] = value[key]
      }
      continue
    }

    if (key === 'level') {
      filteredProps[key] = value[key]
      continue
    }

    if (key === 'markDefs') {
      const {markDefs} = parseMarkDefs({
        context,
        markDefs: value[key],
        options: {validateFields: true},
      })
      filteredProps[key] = markDefs
      continue
    }

    if (context.schema.block.fields?.some((field) => field.name === key)) {
      filteredProps[key] = value[key]
    }
  }

  return filteredProps
}
