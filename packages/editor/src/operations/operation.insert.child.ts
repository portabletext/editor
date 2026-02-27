import {isTextBlock} from '@portabletext/schema'
import {
  applyInsertNodeAtPath,
  applyInsertNodeAtPoint,
} from '../internal-utils/apply-insert-node'
import {getFocusBlock, getFocusSpan} from '../internal-utils/slate-utils'
import {VOID_CHILD_KEY} from '../internal-utils/values'
import type {Node} from '../slate'
import {parseInlineObject, parseSpan} from '../utils/parse-blocks'
import type {OperationImplementation} from './operation.types'

export const insertChildOperationImplementation: OperationImplementation<
  'insert.child'
> = ({context, operation}) => {
  const focus = operation.editor.selection?.focus
  const focusBlockIndex = focus?.path.at(0)
  const focusChildIndex = focus?.path.at(1)

  if (focusBlockIndex === undefined || focusChildIndex === undefined) {
    throw new Error('Unable to insert child without a focus')
  }

  const [focusBlock, focusBlockPath] = getFocusBlock({editor: operation.editor})

  if (!focus || !focusBlock || !focusBlockPath) {
    throw new Error('Unable to insert child without a focus block')
  }

  if (!isTextBlock(context, focusBlock)) {
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
    const [focusSpan] = getFocusSpan({editor: operation.editor})

    if (focusSpan) {
      applyInsertNodeAtPoint(operation.editor, span, focus, {select: true})
    } else {
      applyInsertNodeAtPath(
        operation.editor,
        span,
        [focusBlockIndex, focusChildIndex + 1],
        {select: true},
      )
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
      children: [
        {
          _key: VOID_CHILD_KEY,
          _type: 'span',
          text: '',
          marks: [],
        },
      ],
      ...rest,
    } as unknown as Node

    const [focusSpan] = getFocusSpan({editor: operation.editor})

    if (focusSpan) {
      applyInsertNodeAtPoint(operation.editor, inlineNode, focus, {
        select: true,
      })
    } else {
      applyInsertNodeAtPath(
        operation.editor,
        inlineNode,
        [focusBlockIndex, focusChildIndex + 1],
        {select: true},
      )
    }

    return
  }

  throw new Error('Unable to parse child')
}
