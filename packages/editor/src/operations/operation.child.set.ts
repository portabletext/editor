import {isSpan} from '@portabletext/schema'
import {safeStringify} from '../internal-utils/safe-json'
import {setNodeProperties} from '../internal-utils/set-node-properties'
import {getNode} from '../node-traversal/get-node'
import {getBlockSubSchema} from '../schema/get-block-sub-schema'
import {isObjectNode} from '../slate/node/is-object-node'
import {parentPath} from '../slate/path/parent-path'
import {siblingPath} from '../slate/path/sibling-path'
import type {OperationImplementation} from './operation.types'

export const childSetOperationImplementation: OperationImplementation<
  'child.set'
> = ({context, operation}) => {
  const childEntry = getNode(operation.editor, operation.at)

  if (!childEntry) {
    throw new Error(`Unable to find child at ${safeStringify(operation.at)}`)
  }

  const {node: child, path: childPath} = childEntry

  if (isSpan({schema: operation.editor.schema}, child)) {
    const {_type, text, ...rest} = operation.props

    setNodeProperties(
      operation.editor,
      {
        ...child,
        ...rest,
      },
      childPath,
    )

    const newKey = rest['_key']
    const textPath =
      typeof newKey === 'string' && newKey !== child._key
        ? siblingPath(childPath, newKey)
        : childPath

    if (typeof text === 'string') {
      if (child.text !== text) {
        operation.editor.apply({
          type: 'remove_text',
          path: textPath,
          offset: 0,
          text: child.text,
        })

        operation.editor.apply({
          type: 'insert_text',
          path: textPath,
          offset: 0,
          text,
        })
      }
    }

    return
  }

  if (isObjectNode({schema: operation.editor.schema}, child)) {
    const blockPath = parentPath(childPath)
    const {inlineObjects} = getBlockSubSchema(context, blockPath)
    const definition = inlineObjects.find(
      (definition) => definition.name === child._type,
    )

    if (!definition) {
      throw new Error(
        `Unable to find schema definition for Inline Object type ${child._type}`,
      )
    }

    const {_type, _key, ...rest} = operation.props

    for (const prop in rest) {
      if (!definition.fields.some((field) => field.name === prop)) {
        delete rest[prop]
      }
    }

    setNodeProperties(
      operation.editor,
      {
        ...child,
        _key: typeof _key === 'string' ? _key : child._key,
        ...rest,
      },
      childPath,
    )

    return
  }

  throw new Error(
    `Unable to determine the type of child at ${safeStringify(operation.at)}`,
  )
}
