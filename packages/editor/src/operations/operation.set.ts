import {isSpan, isTextBlock} from '@portabletext/schema'
import {applySetNode} from '../internal-utils/apply-set-node'
import type {KeyedSegment} from '../types/paths'
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

  const slatePath = resolveToSlatePath(operation.editor, path)

  if (!slatePath) {
    throw new Error(
      `Unable to resolve path ${JSON.stringify(path)} to a Slate path`,
    )
  }

  const node = nodeAtSlatePath(operation.editor, slatePath)

  if (!node) {
    throw new Error(`Unable to find node at ${JSON.stringify(path)}`)
  }

  if (isTextBlock(context, node)) {
    applySetNode(
      operation.editor,
      filterTextBlockValue({context, value: operation.value}),
      slatePath,
    )
    return
  }

  if (isSpan(context, node)) {
    const {_type, text, ...rest} = operation.value

    applySetNode(operation.editor, {...node, ...rest}, slatePath)

    if (typeof text === 'string' && text !== node.text) {
      operation.editor.apply({
        type: 'remove_text',
        path: slatePath,
        offset: 0,
        text: node.text,
      })

      operation.editor.apply({
        type: 'insert_text',
        path: slatePath,
        offset: 0,
        text,
      })
    }

    return
  }

  if (operation.editor.isObjectNode(node)) {
    const definition =
      context.schema.blockObjects.find((d) => d.name === node['_type']) ??
      context.schema.inlineObjects.find((d) => d.name === node['_type'])

    if (!definition) {
      throw new Error(
        `Unable to find schema definition for object type ${node['_type']}`,
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
        ...node,
        _key: typeof _key === 'string' ? _key : node['_key'],
        ...rest,
      },
      slatePath,
    )

    return
  }

  // Unknown node type at this depth — apply without schema filtering
  applySetNode(operation.editor, {...node, ...operation.value}, slatePath)
}

function resolveToSlatePath(
  editor: Parameters<OperationImplementation<'set'>>[0]['operation']['editor'],
  path: Parameters<OperationImplementation<'set'>>[0]['operation']['at'],
): number[] | undefined {
  const slatePath: number[] = []
  let current: Record<string, unknown> = editor as unknown as Record<
    string,
    unknown
  >

  for (const segment of path) {
    if (typeof segment === 'string') {
      const field = current[segment]

      if (!Array.isArray(field)) {
        return undefined
      }

      current = {children: field} as Record<string, unknown>
      continue
    }

    if (typeof segment === 'object' && '_key' in segment) {
      const children = current['children'] as Array<{_key: string}> | undefined

      if (!children) {
        return undefined
      }

      const index = children.findIndex(
        (child) => child._key === (segment as KeyedSegment)._key,
      )

      if (index === -1) {
        return undefined
      }

      slatePath.push(index)
      current = children[index] as Record<string, unknown>
      continue
    }

    return undefined
  }

  return slatePath.length > 0 ? slatePath : undefined
}

function nodeAtSlatePath(
  editor: Parameters<OperationImplementation<'set'>>[0]['operation']['editor'],
  slatePath: number[],
): Record<string, unknown> | undefined {
  let node: Record<string, unknown> = editor as unknown as Record<
    string,
    unknown
  >

  for (const index of slatePath) {
    const children = node['children'] as
      | Array<Record<string, unknown>>
      | undefined

    if (!children) {
      return undefined
    }

    node = children[index]!

    if (!node) {
      return undefined
    }
  }

  return node
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
