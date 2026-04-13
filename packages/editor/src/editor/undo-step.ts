import type {Operation} from '../slate/interfaces/operation'
import {pathEquals} from '../slate/path/path-equals'
import type {EditorSelection} from '../types/editor'

type UndoStep = {
  operations: Array<Operation>
  timestamp: Date
}

export function createUndoSteps({
  steps,
  op,
  currentUndoStepId,
  previousUndoStepId,
  selectionBeforeApply,
  operationsInProgress,
  isNormalizingNode,
}: {
  steps: Array<UndoStep>
  op: Operation
  currentUndoStepId: string | undefined
  previousUndoStepId: string | undefined
  selectionBeforeApply: EditorSelection
  operationsInProgress: boolean
  isNormalizingNode: boolean
}): Array<UndoStep> {
  const lastStep = steps.at(-1)

  if (!lastStep) {
    return createNewStep(steps, op, selectionBeforeApply)
  }

  if (operationsInProgress) {
    // The editor has operations in progress

    if (currentUndoStepId === previousUndoStepId || isNormalizingNode) {
      return mergeIntoLastStep(steps, lastStep, op)
    }

    return createNewStep(steps, op, selectionBeforeApply)
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
      pathEquals(op.path, lastOp.path) &&
      op.text !== ' '
    ) {
      return mergeIntoLastStep(steps, lastStep, op)
    }

    if (
      lastOp &&
      op.type === 'remove_text' &&
      lastOp.type === 'remove_text' &&
      op.offset + op.text.length === lastOp.offset &&
      pathEquals(op.path, lastOp.path)
    ) {
      return mergeIntoLastStep(steps, lastStep, op)
    }

    return createNewStep(steps, op, selectionBeforeApply)
  }

  // Handle case when both IDs are defined but different (e.g., consecutive
  // forwarded insert.text events where each send gets a unique ID)
  if (
    currentUndoStepId !== undefined &&
    previousUndoStepId !== undefined &&
    currentUndoStepId !== previousUndoStepId
  ) {
    const lastOp = lastStep.operations.at(-1)

    if (
      lastOp &&
      op.type === 'insert_text' &&
      lastOp.type === 'insert_text' &&
      op.offset === lastOp.offset + lastOp.text.length &&
      pathEquals(op.path, lastOp.path) &&
      op.text !== ' '
    ) {
      return mergeIntoLastStep(steps, lastStep, op)
    }

    if (
      lastOp &&
      op.type === 'remove_text' &&
      lastOp.type === 'remove_text' &&
      op.offset + op.text.length === lastOp.offset &&
      pathEquals(op.path, lastOp.path)
    ) {
      return mergeIntoLastStep(steps, lastStep, op)
    }
  }

  return createNewStep(steps, op, selectionBeforeApply)
}

function createNewStep(
  steps: Array<UndoStep>,
  op: Operation,
  selection: EditorSelection,
): Array<UndoStep> {
  const operations =
    selection === null
      ? [op]
      : [
          {
            type: 'set_selection' as const,
            properties: {...selection},
            newProperties: {...selection},
          },
          op,
        ]

  steps.push({
    operations,
    timestamp: new Date(),
  })

  return steps
}

function mergeIntoLastStep(
  steps: Array<UndoStep>,
  lastStep: UndoStep,
  op: Operation,
): Array<UndoStep> {
  lastStep.operations.push(op)

  return steps
}
