import {isTextBlock} from '@portabletext/schema'
import {applySetNodeKeyed} from '../internal-utils/apply-set-node-keyed'
import {safeStringify} from '../internal-utils/safe-json'
import {getNode} from '../slate/node/get-node'
import {resolveKeyedPath} from '../slate/utils/resolve-keyed-path'
import type {OperationImplementation} from './operation.types'

export const childUnsetOperationImplementation: OperationImplementation<
  'child.unset'
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

  const block = getNode(
    operation.editor,
    [indexedPath.at(0)!],
    operation.editor.schema,
  )

  if (!block) {
    throw new Error(`Unable to find block at ${safeStringify(operation.at)}`)
  }

  if (!isTextBlock(context, block)) {
    throw new Error(
      `Block ${safeStringify(operation.at[0]._key)} is not a text block`,
    )
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

    applySetNodeKeyed(operation.editor, newNode, keyedPath)

    if (operation.props.includes('text')) {
      operation.editor.apply({
        type: 'remove_text',
        path: indexedPath,
        offset: 0,
        text: child.text as string,
      })
    }

    return
  }

  if (operation.editor.isObjectNode(child)) {
    const unsetProps: Record<string, unknown> = {}
    for (const prop of operation.props) {
      if (prop === '_type') {
        continue
      }
      if (prop === '_key') {
        unsetProps['_key'] = context.keyGenerator()
      } else {
        unsetProps[prop] = null
      }
    }
    applySetNodeKeyed(operation.editor, unsetProps, keyedPath)

    return
  }

  throw new Error(
    `Unable to determine the type of child at ${safeStringify(operation.at)}`,
  )
}
