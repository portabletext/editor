import {Path, type Editor, type Operation, type SelectionOperation} from 'slate'
import {isNormalizingNode} from '../editor/with-normalizing-node'
import {defaultKeyGenerator} from '../utils/key-generator'

const CURRENT_UNDO_STEP_ID: WeakMap<Editor, {undoStepId: string} | undefined> =
  new WeakMap()

export function getCurrentUndoStepId(editor: Editor) {
  return CURRENT_UNDO_STEP_ID.get(editor)?.undoStepId
}

export function createUndoStepId(editor: Editor) {
  CURRENT_UNDO_STEP_ID.set(editor, {
    undoStepId: defaultKeyGenerator(),
  })
}

export function clearUndoStepId(editor: Editor) {
  CURRENT_UNDO_STEP_ID.set(editor, undefined)
}

type UndoStep = {
  operations: Array<Operation>
  timestamp: Date
}

export function createUndoSteps({
  steps,
  op,
  editor,
  currentUndoStepId,
  previousUndoStepId,
}: {
  steps: Array<UndoStep>
  op: Operation
  editor: Editor
  currentUndoStepId: string | undefined
  previousUndoStepId: string | undefined
}): Array<UndoStep> {
  const lastStep = steps.at(-1)

  if (!lastStep) {
    return [
      {
        operations: [
          ...(editor.selection === null ? [] : [createSelectOperation(editor)]),
          op,
        ],
        timestamp: new Date(),
      },
    ]
  }

  const selectingWithoutUndoStepId =
    op.type === 'set_selection' &&
    currentUndoStepId === undefined &&
    previousUndoStepId !== undefined
  const selectingWithDifferentUndoStepId =
    op.type === 'set_selection' &&
    currentUndoStepId !== undefined &&
    previousUndoStepId !== undefined &&
    previousUndoStepId !== currentUndoStepId
  const lastOp = lastStep.operations.at(-1)
  const mergeOpIntoPreviousStep =
    editor.operations.length > 0
      ? currentUndoStepId === previousUndoStepId || isNormalizingNode(editor)
      : selectingWithoutUndoStepId ||
          selectingWithDifferentUndoStepId ||
          (currentUndoStepId === undefined && previousUndoStepId === undefined)
        ? shouldMerge(op, lastOp) ||
          (lastOp?.type === 'set_selection' && op.type === 'set_selection')
        : currentUndoStepId === previousUndoStepId || isNormalizingNode(editor)

  if (mergeOpIntoPreviousStep) {
    return [
      ...steps.slice(0, -1),
      {
        timestamp: lastStep.timestamp,
        operations: [...lastStep.operations, op],
      },
    ]
  }

  return [
    ...steps,
    {
      operations: [
        ...(editor.selection === null ? [] : [createSelectOperation(editor)]),
        op,
      ],
      timestamp: new Date(),
    },
  ]
}

const shouldMerge = (op: Operation, prev: Operation | undefined): boolean => {
  if (op.type === 'set_selection') {
    return true
  }

  // Text input
  if (
    prev &&
    op.type === 'insert_text' &&
    prev.type === 'insert_text' &&
    op.offset === prev.offset + prev.text.length &&
    Path.equals(op.path, prev.path) &&
    op.text !== ' ' // Tokenize between words
  ) {
    return true
  }

  // Text deletion
  if (
    prev &&
    op.type === 'remove_text' &&
    prev.type === 'remove_text' &&
    op.offset + op.text.length === prev.offset &&
    Path.equals(op.path, prev.path)
  ) {
    return true
  }

  // Don't merge
  return false
}

function createSelectOperation(editor: Editor): SelectionOperation {
  return {
    type: 'set_selection',
    properties: {...editor.selection},
    newProperties: {...editor.selection},
  }
}
