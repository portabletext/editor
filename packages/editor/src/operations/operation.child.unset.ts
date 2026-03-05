import {isTextBlock} from '@portabletext/schema'
import {applySetNode} from '../internal-utils/apply-set-node'
import {
  resolveBlock,
  resolveChildPath,
} from '../internal-utils/resolve-key-path'
import {Editor} from '../slate'
import type {OperationImplementation} from './operation.types'

export const childUnsetOperationImplementation: OperationImplementation<
  'child.unset'
> = ({context, operation}) => {
  const blockKey = operation.at[0]._key
  const childKey = operation.at[2]._key

  const resolved = resolveBlock(operation.editor, blockKey)

  if (!resolved) {
    throw new Error(
      `Unable to find block with key "${blockKey}" at ${JSON.stringify(operation.at)}`,
    )
  }

  const {node: block} = resolved

  if (!isTextBlock(context, block)) {
    return
  }

  const childPath = resolveChildPath(operation.editor, blockKey, childKey)

  if (!childPath) {
    throw new Error(
      `Unable to find child with key "${childKey}" in block "${blockKey}"`,
    )
  }

  const [child, resolvedChildPath] = Editor.node(operation.editor, childPath, {
    depth: 2,
  })

  if (!child) {
    return
  }

  const isSpan = child._type === context.schema.span.name

  if (isSpan) {
    const propsToRemove = operation.props.filter(
      (prop) =>
        prop !== '_type' &&
        prop !== '_key' &&
        prop !== 'text' &&
        prop !== 'marks',
    )

    const unsetProps: Record<string, null> = {}
    for (const prop of propsToRemove) {
      unsetProps[prop] = null
    }

    applySetNode(operation.editor, unsetProps, resolvedChildPath)

    if (operation.props.includes('_key')) {
      applySetNode(
        operation.editor,
        {_key: context.keyGenerator()},
        resolvedChildPath,
      )
    }

    if (operation.props.includes('text')) {
      const currentText =
        'text' in child && typeof child.text === 'string' ? child.text : ''

      if (currentText.length > 0) {
        operation.editor.apply({
          type: 'remove_text',
          path: resolvedChildPath,
          offset: 0,
          text: currentText,
        })
      }
    }

    return
  }

  // Inline object
  const schemaDefinition = context.schema.inlineObjects.find(
    (definition) => definition.name === child._type,
  )

  const unsetProps: Record<string, unknown> = {}
  for (const key of operation.props) {
    if (key === '_type') {
      continue
    }
    if (key === '_key') {
      unsetProps['_key'] = context.keyGenerator()
    } else if (schemaDefinition?.fields.some((field) => field.name === key)) {
      unsetProps[key] = null
    }
  }

  applySetNode(operation.editor, unsetProps, resolvedChildPath)
}
