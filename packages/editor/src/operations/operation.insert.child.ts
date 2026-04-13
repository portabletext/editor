import {isSpan} from '@portabletext/schema'
import {
  applyInsertNodeAtPath,
  applyInsertNodeAtPoint,
} from '../internal-utils/apply-insert-node'
import {getNode} from '../node-traversal/get-node'
import {getSibling} from '../node-traversal/get-sibling'
import {isTextBlockNode} from '../slate/node/is-text-block-node'
import {parseInlineObject, parseSpan} from '../utils/parse-blocks'
import type {OperationImplementation} from './operation.types'

export const insertChildOperationImplementation: OperationImplementation<
  'insert.child'
> = ({context, operation}) => {
  const focus = operation.editor.selection?.focus
  const focusBlockIndex = focus?.path.at(0)
  const focusChildIndex = focus?.path.at(2)

  if (focusBlockIndex === undefined || focusChildIndex === undefined) {
    throw new Error('Unable to insert child without a focus')
  }

  const focusBlockEntry = focus
    ? getNode(operation.editor, focus.path.slice(0, 1))
    : undefined
  const focusBlock = focusBlockEntry?.node
  const focusBlockPath = focusBlockEntry?.path

  if (!focus || !focusBlock || !focusBlockPath) {
    throw new Error('Unable to insert child without a focus block')
  }

  if (!isTextBlockNode(context, focusBlock)) {
    throw new Error('Unable to insert child into a non-text block')
  }

  const markDefs = focusBlock.markDefs ?? []
  const markDefKeyMap = new Map<string, string>()
  for (const markDef of markDefs) {
    markDefKeyMap.set(markDef._key, markDef._key)
  }

  const span = parseSpan({
    span: operation.child,
    context,
    markDefKeyMap,
    options: {validateFields: true},
  })

  if (span) {
    const focusSpanEntry = getNode(operation.editor, focus.path.slice(0, 3))
    const focusSpan =
      focusSpanEntry &&
      isSpan({schema: operation.editor.schema}, focusSpanEntry.node)
        ? focusSpanEntry.node
        : undefined

    if (focusSpan) {
      applyInsertNodeAtPoint(operation.editor, span, focus)
    } else {
      const focusChildPath = focus.path.slice(0, 3)
      const nextSibling = getSibling(operation.editor, focusChildPath, 'next')
      if (nextSibling) {
        applyInsertNodeAtPath(operation.editor, span, nextSibling.path)
      } else {
        operation.editor.apply({
          type: 'insert',
          path: focusChildPath,
          node: span,
          position: 'after',
        })
      }
    }

    // This makes sure the selection is set correctly when event handling is run
    // through Slate's Android input handling
    operation.editor.pendingSelection = operation.editor.selection

    return
  }

  const inlineObject = parseInlineObject({
    inlineObject: operation.child,
    context,
    options: {validateFields: true},
  })

  if (inlineObject) {
    const {_key, _type, ...rest} = inlineObject

    const inlineNode = {
      _key,
      _type,
      ...rest,
    }

    const focusSpanEntry = getNode(operation.editor, focus.path.slice(0, 3))
    const focusSpan =
      focusSpanEntry &&
      isSpan({schema: operation.editor.schema}, focusSpanEntry.node)
        ? focusSpanEntry.node
        : undefined

    if (focusSpan) {
      applyInsertNodeAtPoint(operation.editor, inlineNode, focus)
    } else {
      const focusChildPath = focus.path.slice(0, 3)
      const nextSibling = getSibling(operation.editor, focusChildPath, 'next')
      if (nextSibling) {
        applyInsertNodeAtPath(operation.editor, inlineNode, nextSibling.path)
      } else {
        operation.editor.apply({
          type: 'insert',
          path: focusChildPath,
          node: inlineNode,
          position: 'after',
        })
      }
    }

    return
  }

  throw new Error('Unable to parse child')
}
