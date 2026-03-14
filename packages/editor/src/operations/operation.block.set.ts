import {applyAll, set} from '@portabletext/patches'
import {isTextBlock} from '@portabletext/schema'
import {applySetNodeKeyed} from '../internal-utils/apply-set-node-keyed'
import {safeStringify} from '../internal-utils/safe-json'
import {getNode} from '../slate/node/get-node'
import {resolveKeyedPath} from '../slate/utils/resolve-keyed-path'
import {parseMarkDefs} from '../utils/parse-blocks'
import type {OperationImplementation} from './operation.types'

export const blockSetOperationImplementation: OperationImplementation<
  'block.set'
> = ({context, operation}) => {
  const indexedPath = resolveKeyedPath(
    operation.editor,
    [operation.at[0]],
    operation.editor.blockIndexMap,
  )

  if (!indexedPath) {
    throw new Error(
      `Unable to find block index for block at ${safeStringify(operation.at)}`,
    )
  }

  const slateBlock = getNode(
    operation.editor,
    indexedPath,
    operation.editor.schema,
  )

  if (!slateBlock) {
    throw new Error(`Unable to find block at ${safeStringify(operation.at)}`)
  }

  if (isTextBlock(context, slateBlock)) {
    const filteredProps: Record<string, unknown> = {}

    for (const key of Object.keys(operation.props)) {
      if (key === '_type' || key === 'children') {
        continue
      }

      if (key === 'style') {
        if (
          context.schema.styles.some(
            (style) => style.name === operation.props[key],
          )
        ) {
          filteredProps[key] = operation.props[key]
        }
        continue
      }

      if (key === 'listItem') {
        if (
          context.schema.lists.some(
            (list) => list.name === operation.props[key],
          )
        ) {
          filteredProps[key] = operation.props[key]
        }
        continue
      }

      if (key === 'level') {
        filteredProps[key] = operation.props[key]
        continue
      }

      if (key === 'markDefs') {
        const {markDefs} = parseMarkDefs({
          context,
          markDefs: operation.props[key],
          options: {validateFields: true},
        })
        filteredProps[key] = markDefs
        continue
      }

      if (context.schema.block.fields?.some((field) => field.name === key)) {
        filteredProps[key] = operation.props[key]
      }
    }

    applySetNodeKeyed(operation.editor, filteredProps, [operation.at[0]])
  } else {
    const schemaDefinition = context.schema.blockObjects.find(
      (definition) => definition.name === slateBlock._type,
    )
    const filteredProps: Record<string, unknown> = {}

    for (const key of Object.keys(operation.props)) {
      if (key === '_type') {
        continue
      }

      if (key === '_key') {
        filteredProps[key] = operation.props[key]
        continue
      }

      if (schemaDefinition?.fields.some((field) => field.name === key)) {
        filteredProps[key] = operation.props[key]
      }
    }

    const patches = Object.entries(filteredProps).map(([key, value]) =>
      set(value, [key]),
    )

    const updatedSlateBlock = applyAll(slateBlock, patches)

    applySetNodeKeyed(operation.editor, updatedSlateBlock, [operation.at[0]])
  }
}
