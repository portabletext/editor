import {isSpan} from '@portabletext/schema'
import {
  applyInsertNodeAtPath,
  applyInsertNodeAtPoint,
} from '../internal-utils/apply-insert-node'
import {getAncestorTextBlock} from '../node-traversal/get-ancestor-text-block'
import {getNode} from '../node-traversal/get-node'
import {getSibling} from '../node-traversal/get-sibling'
import {isTextBlockNode} from '../slate/node/is-text-block-node'
import {parseInlineObject, parseSpan} from '../utils/parse-blocks'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {OperationImplementation} from './operation.types'

export const insertChildOperationImplementation: OperationImplementation<
  'insert.child'
> = ({context, operation}) => {
  const focus = operation.editor.selection?.focus

  if (!focus) {
    throw new Error('Unable to insert child without a focus')
  }

  const focusBlockEntry = getAncestorTextBlock(operation.editor, focus.path)

  if (!focusBlockEntry) {
    throw new Error('Unable to insert child without a focus block')
  }

  const focusBlock = focusBlockEntry.node

  if (!isTextBlockNode(context, focusBlock)) {
    throw new Error('Unable to insert child into a non-text block')
  }

  const focusChildSegment = focus.path.at(-1)

  if (!isKeyedSegment(focusChildSegment)) {
    throw new Error('Unable to insert child without a focus child')
  }

  const focusChildPath = [
    ...focusBlockEntry.path,
    'children',
    focusChildSegment,
  ]

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
    const focusSpanEntry = getNode(operation.editor, focusChildPath)
    const focusSpan =
      focusSpanEntry &&
      isSpan({schema: operation.editor.schema}, focusSpanEntry.node)
        ? focusSpanEntry.node
        : undefined

    if (focusSpan) {
      applyInsertNodeAtPoint(operation.editor, span, focus)
    } else {
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

    const focusSpanEntry = getNode(operation.editor, focusChildPath)
    const focusSpan =
      focusSpanEntry &&
      isSpan({schema: operation.editor.schema}, focusSpanEntry.node)
        ? focusSpanEntry.node
        : undefined

    if (focusSpan) {
      applyInsertNodeAtPoint(operation.editor, inlineNode, focus)
    } else {
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
