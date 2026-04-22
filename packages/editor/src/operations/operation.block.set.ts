import {applyAll, set} from '@portabletext/patches'
import {safeStringify} from '../internal-utils/safe-json'
import {setNodeProperties} from '../internal-utils/set-node-properties'
import {getNode} from '../node-traversal/get-node'
import {getBlockObjectSchema} from '../schema/get-block-object-schema'
import {getBlockSubSchema} from '../schema/get-block-sub-schema'
import {isTextBlockNode} from '../slate/node/is-text-block-node'
import {parseMarkDefs} from '../utils/parse-blocks'
import type {OperationImplementation} from './operation.types'

export const blockSetOperationImplementation: OperationImplementation<
  'block.set'
> = ({context, operation}) => {
  const blockEntry = getNode(operation.editor, operation.at)

  if (!blockEntry) {
    throw new Error(`Unable to find block at ${safeStringify(operation.at)}`)
  }

  const slateBlock = blockEntry.node

  if (isTextBlockNode(context, slateBlock)) {
    const subSchema = getBlockSubSchema(context, blockEntry.path)
    const filteredProps: Record<string, unknown> = {}

    for (const key of Object.keys(operation.props)) {
      if (key === '_type') {
        continue
      }

      if (key === '_key') {
        filteredProps[key] = operation.props[key]
        continue
      }

      if (key === 'style') {
        if (
          subSchema.styles.some((style) => style.name === operation.props[key])
        ) {
          filteredProps[key] = operation.props[key]
        }
        continue
      }

      if (key === 'listItem') {
        if (
          subSchema.lists.some((list) => list.name === operation.props[key])
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

    setNodeProperties(operation.editor, filteredProps, blockEntry.path)
  } else {
    const schemaDefinition = getBlockObjectSchema(
      context,
      slateBlock,
      blockEntry.path,
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

      if (schemaDefinition?.fields?.some((field) => field.name === key)) {
        filteredProps[key] = operation.props[key]
      }
    }

    const patches = Object.entries(filteredProps).map(([key, value]) =>
      set(value, [key]),
    )

    const updatedSlateBlock = applyAll(slateBlock, patches)

    setNodeProperties(operation.editor, updatedSlateBlock, blockEntry.path)
  }
}
