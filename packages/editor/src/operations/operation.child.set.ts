import {isSpan} from '@portabletext/schema'
import {parentPath} from '../engine/path/parent-path'
import {siblingPath} from '../engine/path/sibling-path'
import {safeStringify} from '../internal-utils/safe-json'
import {setNodeProperties} from '../internal-utils/set-node-properties'
import {getNode} from '../traversal/get-node'
import {getPathSubSchema} from '../traversal/get-path-sub-schema'
import {isObject} from '../traversal/is-object'
import type {OperationImplementation} from './operation.types'

export const childSetOperationImplementation: OperationImplementation<
  'child.set'
> = ({snapshot, operation}) => {
  const childEntry = getNode(operation.editor.snapshot, operation.at)

  if (!childEntry) {
    throw new Error(`Unable to find child at ${safeStringify(operation.at)}`)
  }

  const {node: child, path: childPath} = childEntry

  if (isSpan({schema: operation.editor.snapshot.context.schema}, child)) {
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
          type: 'remove.text',
          path: textPath,
          offset: 0,
          text: child.text,
        })

        operation.editor.apply({
          type: 'insert.text',
          path: textPath,
          offset: 0,
          text,
        })
      }
    }

    return
  }

  if (isObject(operation.editor.snapshot, child)) {
    const blockPath = parentPath(childPath)
    const {inlineObjects} = getPathSubSchema(snapshot, blockPath)
    const definition = inlineObjects.find(
      (definition) => definition.name === child._type,
    )

    if (!definition) {
      // Inline object type is not in the path's sub-schema. Noop.
      return
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
