import {Path, type Editor, type Operation} from 'slate'
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
    return createNewStep(steps, op, editor)
  }

  if (editor.operations.length > 0) {
    // The editor has operations in progress

    if (currentUndoStepId === previousUndoStepId || isNormalizingNode(editor)) {
      return mergeIntoLastStep(steps, lastStep, op)
    }

    return createNewStep(steps, op, editor)
  }

  if (
    op.type === 'set_selection' &&
    currentUndoStepId === undefined &&
    previousUndoStepId !== undefined
  ) {
    // Selecting without undo step ID
    return mergeIntoLastStep(steps, lastStep, op)
  }

  if (
    op.type === 'set_selection' &&
    currentUndoStepId !== undefined &&
    previousUndoStepId !== undefined &&
    previousUndoStepId !== currentUndoStepId
  ) {
    // Selecting with different undo step ID
    return mergeIntoLastStep(steps, lastStep, op)
  }

  // Handle case when both IDs are undefined
  if (currentUndoStepId === undefined && previousUndoStepId === undefined) {
    if (op.type === 'set_selection') {
      return mergeIntoLastStep(steps, lastStep, op)
    }

    const lastOp = lastStep.operations.at(-1)

    if (
      lastOp &&
      op.type === 'insert_text' &&
      lastOp.type === 'insert_text' &&
      op.offset === lastOp.offset + lastOp.text.length &&
      Path.equals(op.path, lastOp.path) &&
      op.text !== ' '
    ) {
      return mergeIntoLastStep(steps, lastStep, op)
    }

    if (
      lastOp &&
      op.type === 'remove_text' &&
      lastOp.type === 'remove_text' &&
      op.offset + op.text.length === lastOp.offset &&
      Path.equals(op.path, lastOp.path)
    ) {
      return mergeIntoLastStep(steps, lastStep, op)
    }

    return createNewStep(steps, op, editor)
  }

  return createNewStep(steps, op, editor)
}

function createNewStep(
  steps: Array<UndoStep>,
  op: Operation,
  editor: Editor,
): Array<UndoStep> {
  const operations =
    editor.selection === null
      ? [op]
      : [
          {
            type: 'set_selection' as const,
            properties: {...editor.selection},
            newProperties: {...editor.selection},
          },
          op,
        ]

  return [
    ...steps,
    {
      operations,
      timestamp: new Date(),
    },
  ]
}

function mergeIntoLastStep(
  steps: Array<UndoStep>,
  lastStep: UndoStep,
  op: Operation,
): Array<UndoStep> {
  return [
    ...steps.slice(0, -1),
    {
      timestamp: lastStep.timestamp,
      operations: [...lastStep.operations, op],
    },
  ]
}
