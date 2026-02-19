import {isTextBlock} from '@portabletext/schema'
import {Transforms, type Descendant} from '../slate'
import {parseMarkDefs} from '../utils/parse-blocks'
import type {OperationImplementation} from './operation.types'

export const blockSetOperationImplementation: OperationImplementation<
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

    // Slate's set_node rejects 'text' and 'children' in newProperties,
    // but block objects can have user-defined fields with those names.
    const safeProps: Record<string, unknown> = {}
    const unsafeProps: Record<string, unknown> = {}

    for (const key in filteredProps) {
      if (key === 'text' || key === 'children') {
        unsafeProps[key] = filteredProps[key]
      } else {
        safeProps[key] = filteredProps[key]
      }
    }

    if (Object.keys(safeProps).length > 0) {
      Transforms.setNodes(operation.editor, safeProps, {at: [blockIndex]})
    }

    if (Object.keys(unsafeProps).length > 0) {
      const newNode = {
        ...(slateBlock as Record<string, unknown>),
        ...unsafeProps,
      }
      operation.editor.apply({
        type: 'remove_node',
        path: [blockIndex],
        node: slateBlock as Descendant,
      })
      operation.editor.apply({
        type: 'insert_node',
        path: [blockIndex],
        node: newNode as unknown as Descendant,
      })
    }
  }
}
