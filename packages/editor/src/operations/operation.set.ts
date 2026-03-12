import type {PortableTextTextBlock} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import {applySetNode} from '../internal-utils/apply-set-node'
import {safeStringify} from '../internal-utils/safe-json'
import type {Descendant} from '../slate'
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
      block,
      blockIndex,
    })
    return
  }

  // Child-level set on text blocks
  if (
    path.length === 3 &&
    path[1] === 'children' &&
    isTextBlock(context, block)
  ) {
    setAtChild({context, operation, block, blockIndex})
    return
  }

  // Deep path — translate keyed segments to indices and apply
  const indexedPath = translateToIndexedPath(operation.editor.children, path)
  applySetNode(operation.editor, operation.value, indexedPath)
}

function setAtBlock({
  context,
  operation,
  block,
  blockIndex,
}: {
  context: Parameters<OperationImplementation<'set'>>[0]['context']
  operation: Parameters<OperationImplementation<'set'>>[0]['operation']
  block: Descendant
  blockIndex: number
}) {
  if (isTextBlock(context, block)) {
    const filteredProps: Record<string, unknown> = {}

    for (const key of Object.keys(operation.value)) {
      if (key === '_type' || key === 'children') {
        continue
      }

      if (key === 'style') {
        if (
          context.schema.styles.some(
            (style) => style.name === operation.value[key],
          )
        ) {
          filteredProps[key] = operation.value[key]
        }
        continue
      }

      if (key === 'listItem') {
        if (
          context.schema.lists.some(
            (list) => list.name === operation.value[key],
          )
        ) {
          filteredProps[key] = operation.value[key]
        }
        continue
      }

      if (key === 'level') {
        filteredProps[key] = operation.value[key]
        continue
      }

      if (key === 'markDefs') {
        const {markDefs} = parseMarkDefs({
          context,
          markDefs: operation.value[key],
          options: {validateFields: true},
        })
        filteredProps[key] = markDefs
        continue
      }

      if (context.schema.block.fields?.some((field) => field.name === key)) {
        filteredProps[key] = operation.value[key]
      }
    }

    applySetNode(operation.editor, filteredProps, [blockIndex])
  } else {
    const schemaDefinition = context.schema.blockObjects.find(
      (definition) => definition.name === block['_type'],
    )
    const filteredProps: Record<string, unknown> = {}

    for (const key of Object.keys(operation.value)) {
      if (key === '_type') {
        continue
      }

      if (key === '_key') {
        filteredProps[key] = operation.value[key]
        continue
      }

      if (schemaDefinition?.fields.some((field) => field.name === key)) {
        filteredProps[key] = operation.value[key]
      }
    }

    applySetNode(operation.editor, filteredProps, [blockIndex])
  }
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

  if (
    typeof childSegment !== 'object' ||
    !('_key' in childSegment) ||
    typeof childSegment._key !== 'string'
  ) {
    throw new Error(
      `Expected keyed segment at path[2], got ${safeStringify(childSegment)}`,
    )
  }

  const childIndex = block.children.findIndex(
    (c) => c._key === childSegment._key,
  )

  if (childIndex === -1) {
    throw new Error(
      `Unable to find child with key ${safeStringify(childSegment._key)} in block`,
    )
  }

  const child = block.children[childIndex]!
  const childPath: [number, number] = [blockIndex, childIndex]

  if (operation.editor.isTextSpan(child)) {
    const {_type, text, ...rest} = operation.value

    applySetNode(
      operation.editor,
      {
        ...child,
        ...rest,
      },
      childPath,
    )

    if (typeof text === 'string') {
      if (child.text !== text) {
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
    }

    return
  }

  if (operation.editor.isObjectNode(child)) {
    const definition = context.schema.inlineObjects.find(
      (definition) => definition.name === child['_type'],
    )

    if (!definition) {
      throw new Error(
        `Unable to find schema definition for Inline Object type ${child['_type']}`,
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
        ...child,
        _key: typeof _key === 'string' ? _key : child._key,
        ...rest,
      },
      childPath,
    )

    return
  }

  throw new Error(
    `Unable to determine the type of child at ${safeStringify(operation.at)}`,
  )
}

function translateToIndexedPath(
  children: Array<unknown>,
  path: ReadonlyArray<unknown>,
): Array<number | string> {
  const result: Array<number | string> = []
  let current: unknown = {children}

  for (const segment of path) {
    if (typeof current !== 'object' || current === null) {
      throw new Error(
        `Cannot navigate path ${safeStringify(path)}: hit non-object`,
      )
    }

    if (typeof segment === 'object' && segment !== null && '_key' in segment) {
      const key = String(segment._key)
      const arr = Array.isArray(current)
        ? current
        : 'children' in current
          ? (current.children as Array<unknown>)
          : undefined

      if (!arr) {
        throw new Error(
          `Cannot find children for key ${safeStringify(key)} in path`,
        )
      }

      const index = arr.findIndex(
        (item) =>
          typeof item === 'object' &&
          item !== null &&
          '_key' in item &&
          item._key === key,
      )

      if (index === -1) {
        throw new Error(
          `Cannot find item with key ${safeStringify(key)} in path`,
        )
      }

      result.push(index)
      current = arr[index]
    } else if (typeof segment === 'string') {
      result.push(segment)
      current = (current as Record<string, unknown>)[segment]
    } else if (typeof segment === 'number') {
      result.push(segment)

      const arr = Array.isArray(current)
        ? current
        : 'children' in current
          ? (current.children as Array<unknown>)
          : undefined

      current = arr ? arr[segment] : undefined
    }
  }

  return result
}
