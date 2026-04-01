import {applySetNode} from '../internal-utils/apply-set-node'
import {getNode} from '../node-traversal/get-node'
import {keyedPathToIndexedPath} from '../paths/keyed-path-to-indexed-path'
import {isTextBlockNode} from '../slate/node/is-text-block-node'
import {parseMarkDefs} from '../utils/parse-blocks'
import type {OperationImplementation} from './operation.types'

export const setOperationImplementation: OperationImplementation<'set'> = ({
  context,
  operation,
}) => {
  const indexedPath = keyedPathToIndexedPath(
    {children: operation.editor.children},
    operation.at,
    operation.editor.blockIndexMap,
  )

  if (!indexedPath) {
    return
  }

  const nodeResult = getNode(
    {
      schema: context.schema,
      editableTypes: operation.editor.editableTypes,
      value: operation.editor.children,
    },
    indexedPath,
  )

  if (!nodeResult) {
    return
  }

  if (isTextBlockNode(context, nodeResult.node)) {
    const filteredProps: Record<string, unknown> = {}

    for (const key of Object.keys(operation.props)) {
      if (key === 'markDefs') {
        const {markDefs} = parseMarkDefs({
          context,
          markDefs: operation.props[key],
          options: {validateFields: true},
        })
        filteredProps[key] = markDefs
      } else {
        filteredProps[key] = operation.props[key]
      }
    }

    applySetNode(operation.editor, filteredProps, indexedPath)
    return
  }

  applySetNode(operation.editor, operation.props, indexedPath)
}
