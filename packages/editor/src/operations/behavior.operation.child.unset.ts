import {applyAll} from '@portabletext/patches'
import {isTextBlock} from '@portabletext/schema'
import {Editor, Element, Transforms} from 'slate'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const childUnsetOperationImplementation: BehaviorOperationImplementation<
  'child.unset'
> = ({context, operation}) => {
  const blockKey = operation.at[0]._key
  const blockIndex = operation.editor.blockIndexMap.get(blockKey)

  if (blockIndex === undefined) {
    throw new Error(`Unable to find block index for block key ${blockKey}`)
  }

  const block =
    blockIndex !== undefined ? operation.editor.value.at(blockIndex) : undefined

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
        newNode._key = context.keyGenerator()
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

  if (Element.isElement(child)) {
    const value =
      'value' in child && typeof child.value === 'object' ? child.value : {}
    const patches = operation.props.map((prop) => ({
      type: 'unset' as const,
      path: [prop],
    }))
    const newValue = applyAll(value, patches)

    Transforms.setNodes(
      operation.editor,
      {
        ...child,
        _key: operation.props.includes('_key')
          ? context.keyGenerator()
          : child._key,
        value: newValue,
      },
      {at: childPath},
    )

    return
  }

  throw new Error(
    `Unable to determine the type of child at ${JSON.stringify(operation.at)}`,
  )
}
