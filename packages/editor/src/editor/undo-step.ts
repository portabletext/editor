import {Path, type Operation} from '../slate'
import type {PortableTextSlateEditor} from '../types/slate-editor'

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
  editor: PortableTextSlateEditor
  currentUndoStepId: string | undefined
  previousUndoStepId: string | undefined
}): Array<UndoStep> {
  const lastStep = steps.at(-1)

  if (!lastStep) {
    return createNewStep(steps, op, editor)
  }

  if (editor.operations.length > 0) {
    // The editor has operations in progress

    if (currentUndoStepId === previousUndoStepId || editor.isNormalizingNode) {
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

  // Check for consecutive text operations that should be grouped,
  // even when undoStepIds differ (e.g., when behaviors intercept
  // each keystroke and each gets a fresh undoStepId).
  // Look past non-text ops (like set_node from decorator operations)
  // to find the last insert_text or remove_text op in the previous step.
  if (op.type === 'insert_text' || op.type === 'remove_text') {
    const lastTextOp = findLastTextOp(lastStep.operations)

    if (
      lastTextOp &&
      op.type === 'insert_text' &&
      lastTextOp.type === 'insert_text' &&
      op.offset === lastTextOp.offset + lastTextOp.text.length &&
      Path.equals(op.path, lastTextOp.path) &&
      op.text !== ' '
    ) {
      return mergeIntoLastStep(steps, lastStep, op)
    }

    if (
      lastTextOp &&
      op.type === 'remove_text' &&
      lastTextOp.type === 'remove_text' &&
      op.offset + op.text.length === lastTextOp.offset &&
      Path.equals(op.path, lastTextOp.path)
    ) {
      return mergeIntoLastStep(steps, lastStep, op)
    }
  }

  // Handle case when both IDs are undefined
  if (currentUndoStepId === undefined && previousUndoStepId === undefined) {
    if (op.type === 'set_selection') {
      return mergeIntoLastStep(steps, lastStep, op)
    }

    return createNewStep(steps, op, editor)
  }

  return createNewStep(steps, op, editor)
}

function createNewStep(
  steps: Array<UndoStep>,
  op: Operation,
  editor: PortableTextSlateEditor,
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

/**
 * Find the last insert_text or remove_text operation in a list of operations.
 * Skips past non-text ops like set_node (from decorator operations),
 * split_node, set_selection, etc.
 */
function findLastTextOp(
  operations: Array<Operation>,
): (Operation & {type: 'insert_text' | 'remove_text'}) | undefined {
  for (let i = operations.length - 1; i >= 0; i--) {
    const op = operations[i]
    if (
      op !== undefined &&
      (op.type === 'insert_text' || op.type === 'remove_text')
    ) {
      return op as Operation & {type: 'insert_text' | 'remove_text'}
    }
  }
  return undefined
}
