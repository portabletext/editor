import {isSpan} from '@portabletext/schema'
import {applySetNode} from '../internal-utils/apply-set-node'
import {safeStringify} from '../internal-utils/safe-json'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {node as editorNode} from '../slate/editor/node'
import {isObjectNode} from '../slate/node/is-object-node'
import type {OperationImplementation} from './operation.types'

export const childSetOperationImplementation: OperationImplementation<
  'child.set'
> = ({context, operation}) => {
  const location = toSlateRange({
    context: {
      schema: context.schema,
      value: operation.editor.children,
      selection: {
        anchor: {path: operation.at, offset: 0},
        focus: {path: operation.at, offset: 0},
      },
    },
    blockIndexMap: operation.editor.blockIndexMap,
  })

  if (!location) {
    throw new Error(
      `Unable to convert ${safeStringify(operation.at)} into a Slate Range`,
    )
  }

  const childEntry = editorNode(operation.editor, location, {depth: 2})
  const child = childEntry?.[0]
  const childPath = childEntry?.[1]

  if (!child || !childPath) {
    throw new Error(`Unable to find child at ${safeStringify(operation.at)}`)
  }

  if (isSpan({schema: operation.editor.schema}, child)) {
    const {_type, text, ...rest} = operation.props

    applySetNode(
      operation.editor,
      {
        ...child,
        ...rest,
      },
      childPath,
    )

    if (typeof text === 'string') {
      if (child.text !== text) {
        operation.editor.apply({
          type: 'remove_text',
          path: childPath,
          offset: 0,
          text: child.text,
        })

        operation.editor.apply({
          type: 'insert_text',
          path: childPath,
          offset: 0,
          text,
        })
      }
    }

    return
  }

  if (isObjectNode({schema: operation.editor.schema}, child)) {
    const definition = context.schema.inlineObjects.find(
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

    applySetNode(
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
