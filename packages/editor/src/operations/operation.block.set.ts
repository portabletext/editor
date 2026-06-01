import {applyAll, set} from '@portabletext/patches'
import {isTextBlockNode} from '../engine/node/is-text-block-node'
import {safeStringify} from '../internal-utils/safe-json'
import {setNodeProperties} from '../internal-utils/set-node-properties'
import {getBlockObjectSchema} from '../schema/get-block-object-schema'
import {getNode} from '../traversal/get-node'
import {getPathSubSchema} from '../traversal/get-path-sub-schema'
import {parseMarkDefs} from '../utils/parse-blocks'
import type {OperationImplementation} from './operation.types'

export const blockSetOperationImplementation: OperationImplementation<
  'block.set'
> = ({snapshot, operation}) => {
  const {context} = snapshot
  const blockEntry = getNode(operation.editor, operation.at)

  if (!blockEntry) {
    throw new Error(`Unable to find block at ${safeStringify(operation.at)}`)
  }

  const engineBlock = blockEntry.node

  if (isTextBlockNode(context, engineBlock)) {
    const subSchema = getPathSubSchema(snapshot, blockEntry.path)
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
        // Only set level when the block's sub-schema declares any lists.
        // Blocks that cannot carry list items should not carry level either.
        if (subSchema.lists.length > 0) {
          filteredProps[key] = operation.props[key]
        }
        continue
      }

      if (key === 'markDefs') {
        const {markDefs} = parseMarkDefs({
          keyGenerator: context.keyGenerator,
          markDefs: operation.props[key],
          options: {validateFields: true},
          schema: getPathSubSchema(snapshot, blockEntry.path),
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
      snapshot,
      engineBlock,
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

    const updatedEngineBlock = applyAll(engineBlock, patches)

    setNodeProperties(operation.editor, updatedEngineBlock, blockEntry.path)
  }
}
