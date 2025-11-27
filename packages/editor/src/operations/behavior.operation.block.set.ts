import {applyAll, set} from '@portabletext/patches'
import {isTextBlock} from '@portabletext/schema'
import {Transforms, type Node} from 'slate'
import {parseMarkDefs} from '../utils/parse-blocks'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const blockSetOperationImplementation: BehaviorOperationImplementation<
  'block.set'
> = ({context, operation}) => {
  const blockIndex = operation.editor.blockIndexMap.get(operation.at[0]._key)

  if (blockIndex === undefined) {
    throw new Error(
      `Unable to find block index for block at ${JSON.stringify(operation.at)}`,
    )
  }

  const slateBlock = operation.editor.children.at(blockIndex)

  if (!slateBlock) {
    throw new Error(`Unable to find block at ${JSON.stringify(operation.at)}`)
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

    Transforms.setNodes(operation.editor, filteredProps, {at: [blockIndex]})
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
      key === '_key' ? set(value, ['_key']) : set(value, ['value', key]),
    )

    const updatedSlateBlock = applyAll(slateBlock, patches) as Partial<Node>

    Transforms.setNodes(operation.editor, updatedSlateBlock, {at: [blockIndex]})
  }
}
