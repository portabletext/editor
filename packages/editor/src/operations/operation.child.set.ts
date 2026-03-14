import {applySetNodeKeyed} from '../internal-utils/apply-set-node-keyed'
import {safeStringify} from '../internal-utils/safe-json'
import {getNode} from '../slate/node/get-node'
import {resolveKeyedPath} from '../slate/utils/resolve-keyed-path'
import type {OperationImplementation} from './operation.types'

export const childSetOperationImplementation: OperationImplementation<
  'child.set'
> = ({context, operation}) => {
  const keyedPath = [operation.at[0], 'children', operation.at[2]]
  const indexedPath = resolveKeyedPath(
    operation.editor,
    keyedPath,
    operation.editor.blockIndexMap,
  )

  if (!indexedPath) {
    throw new Error(`Unable to find child at ${safeStringify(operation.at)}`)
  }

  const child = getNode(
    operation.editor,
    indexedPath,
    operation.editor.schema,
  ) as Record<string, unknown>

  if (!child) {
    throw new Error(`Unable to find child at ${safeStringify(operation.at)}`)
  }

  if (operation.editor.isTextSpan(child)) {
    const {_type, text, ...rest} = operation.props

    applySetNodeKeyed(
      operation.editor,
      {
        ...child,
        ...rest,
      },
      keyedPath,
    )

    if (typeof text === 'string') {
      if (child['text'] !== text) {
        operation.editor.apply({
          type: 'remove_text',
          path: indexedPath,
          offset: 0,
          text: child['text'] as string,
        })

        operation.editor.apply({
          type: 'insert_text',
          path: indexedPath,
          offset: 0,
          text,
        })
      }
    }

    return
  }

  if (operation.editor.isObjectNode(child)) {
    const definition = context.schema.inlineObjects.find(
      (definition) => definition.name === child['_type'],
    )

    if (!definition) {
      throw new Error(
        `Unable to find schema definition for Inline Object type ${child['_type']}`,
      )
    }

    const {_type, _key, ...rest} = operation.props

    for (const prop in rest) {
      if (!definition.fields.some((field) => field.name === prop)) {
        delete rest[prop]
      }
    }

    applySetNodeKeyed(
      operation.editor,
      {
        ...child,
        _key: typeof _key === 'string' ? _key : child['_key'],
        ...rest,
      },
      keyedPath,
    )

    return
  }

  throw new Error(
    `Unable to determine the type of child at ${safeStringify(operation.at)}`,
  )
}
