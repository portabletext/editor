import {applyAll, set} from '@portabletext/patches'
import {isTextBlock, type PortableTextBlock} from '@portabletext/schema'
import {getIndexForKey} from '@sanity/json-match'
import {applySetNode} from '../internal-utils/apply-set-node'
import {parseMarkDefs} from '../utils/parse-blocks'
import type {OperationImplementation} from './operation.types'

export const blockSetOperationImplementation: OperationImplementation<
  'block.set'
> = ({context, operation}) => {
  const blockIndex = getIndexForKey(operation.editor.children as Array<PortableTextBlock>, operation.at[0]._key)

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

    applySetNode(operation.editor, filteredProps, [blockIndex])
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

    applySetNode(operation.editor, updatedSlateBlock, [blockIndex])
  }
}
