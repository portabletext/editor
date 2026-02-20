import {isTextBlock} from '@portabletext/schema'
import {Editor, Transforms} from '../slate'
import type {OperationImplementation} from './operation.types'

export const childUnsetOperationImplementation: OperationImplementation<
  'child.unset'
> = ({context, operation}) => {
  const blockKey = operation.at[0]._key
  const blockIndex = operation.editor.blockIndexMap.get(blockKey)

  if (blockIndex === undefined) {
    throw new Error(`Unable to find block index for block key ${blockKey}`)
  }

  const block =
    blockIndex !== undefined
      ? operation.editor.children.at(blockIndex)
      : undefined

  if (!block) {
    throw new Error(`Unable to find block at ${JSON.stringify(operation.at)}`)
  }

  if (!isTextBlock(context, block)) {
    throw new Error(`Block ${JSON.stringify(blockKey)} is not a text block`)
  }

  const childKey = operation.at[2]._key

  if (!childKey) {
    throw new Error(
      `Unable to find child key at ${JSON.stringify(operation.at)}`,
    )
  }

  const childIndex = block.children.findIndex(
    (child) => child._key === childKey,
  )

  if (childIndex === -1) {
    throw new Error(`Unable to find child at ${JSON.stringify(operation.at)}`)
  }

  const childEntry = Editor.node(operation.editor, [blockIndex, childIndex], {
    depth: 2,
  })
  const child = childEntry?.[0]
  const childPath = childEntry?.[1]

  if (!child || !childPath) {
    throw new Error(`Unable to find child at ${JSON.stringify(operation.at)}`)
  }

  if (operation.editor.isTextSpan(child)) {
    const newNode: Record<string, unknown> = {}

    for (const prop of operation.props) {
      if (prop === 'text') {
        // Unsetting `text` requires special treatment
        continue
      }

      if (prop === '_type') {
        // It's not allowed to unset the _type of a span
        continue
      }

      if (prop === '_key') {
        newNode['_key'] = context.keyGenerator()
        continue
      }

      newNode[prop] = null
    }

    Transforms.setNodes(operation.editor, newNode, {at: childPath})

    if (operation.props.includes('text')) {
      operation.editor.apply({
        type: 'remove_text',
        path: childPath,
        offset: 0,
        text: child.text,
      })
    }

    return
  }

  if (operation.editor.isElement(child)) {
    // Properties live directly on the node now (no value wrapper)
    // Use Transforms.unsetNodes for top-level properties
    const propsToUnset = operation.props.filter(
      (prop) => prop !== '_type' && prop !== '_key',
    )

    if (propsToUnset.length > 0) {
      Transforms.unsetNodes(operation.editor, propsToUnset, {at: childPath})
    }

    if (operation.props.includes('_key')) {
      Transforms.setNodes(
        operation.editor,
        {_key: context.keyGenerator()},
        {at: childPath},
      )
    }

    return
  }

  throw new Error(
    `Unable to determine the type of child at ${JSON.stringify(operation.at)}`,
  )
}
