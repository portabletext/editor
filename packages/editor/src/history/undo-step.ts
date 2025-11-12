import {Path, type Editor, type Operation, type SelectionOperation} from 'slate'
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

  if (
    editor.operations.length > 0 &&
    currentUndoStepId === previousUndoStepId
  ) {
    // Merging batched operations into the last step
    // But only if we aren't unsetting the undo step ID
    return [
      ...steps.slice(0, -1),
      {
        timestamp: lastStep.timestamp,
        operations: [...lastStep.operations, op],
      },
    ]
  }

  if (previousUndoStepId === undefined && currentUndoStepId === undefined) {
    if (op.type === 'set_selection') {
      // Selecting without an undo step ID
      return [
        ...steps.slice(0, -1),
        {
          timestamp: lastStep.timestamp,
          operations: [...lastStep.operations, op],
        },
      ]
    }

    const lastOp = lastStep.operations.at(-1)

    if (
      lastOp &&
      op.type === 'insert_text' &&
      lastOp.type === 'insert_text' &&
      op.offset === lastOp.offset + lastOp.text.length &&
      Path.equals(op.path, lastOp.path) &&
      op.text !== ' ' // Tokenize between words
    ) {
      return [
        ...steps.slice(0, -1),
        {
          timestamp: lastStep.timestamp,
          operations: [...lastStep.operations, op],
        },
      ]
    }

    if (
      lastOp &&
      op.type === 'remove_text' &&
      lastOp.type === 'remove_text' &&
      op.offset + op.text.length === lastOp.offset &&
      Path.equals(op.path, lastOp.path)
    ) {
      return [
        ...steps.slice(0, -1),
        {
          timestamp: lastStep.timestamp,
          operations: [...lastStep.operations, op],
        },
      ]
    }
  }

  if (
    op.type === 'set_selection' &&
    currentUndoStepId === undefined &&
    previousUndoStepId !== undefined
  ) {
    // Selecting with an unset undo step ID
    return [
      ...steps.slice(0, -1),
      {
        timestamp: lastStep.timestamp,
        operations: [...lastStep.operations, op],
      },
    ]
  }

  if (
    op.type === 'set_selection' &&
    currentUndoStepId !== undefined &&
    previousUndoStepId !== undefined &&
    previousUndoStepId !== currentUndoStepId
  ) {
    // Selecting with a different undo step ID
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

function createSelectOperation(editor: Editor): SelectionOperation {
  return {
    type: 'set_selection',
    properties: {...editor.selection},
    newProperties: {...editor.selection},
  }
}
