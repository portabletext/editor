import type {EngineOperation} from '../engine/interfaces/operation'
import type {Range} from '../engine/interfaces/range'
import {pathEquals} from '../engine/path/path-equals'

type UndoStep = {
  operations: Array<EngineOperation>
  timestamp: Date
}

export function createUndoSteps({
  steps,
  op,
  currentUndoStepId,
  previousUndoStepId,
  operationsInProgress,
  isNormalizingNode,
  selectionBeforeApply,
}: {
  steps: Array<UndoStep>
  op: EngineOperation
  currentUndoStepId: string | undefined
  previousUndoStepId: string | undefined
  /** Snapshots of pre-apply editor state — volatile during apply. */
  operationsInProgress: boolean
  isNormalizingNode: boolean
  selectionBeforeApply: Range | null
}): Array<UndoStep> {
  const lastStep = steps.at(-1)

  if (!lastStep) {
    return createNewStep(steps, op, selectionBeforeApply)
  }

  if (operationsInProgress) {
    // The editor had operations in progress when apply started.

    if (currentUndoStepId === previousUndoStepId || isNormalizingNode) {
      return mergeIntoLastStep(steps, lastStep, op)
    }

    return createNewStep(steps, op, selectionBeforeApply)
  }

  if (
    op.type === 'set.selection' &&
    currentUndoStepId === undefined &&
    previousUndoStepId !== undefined
  ) {
    // Selecting without undo step ID
    return mergeIntoLastStep(steps, lastStep, op)
  }

  if (
    op.type === 'set.selection' &&
    currentUndoStepId !== undefined &&
    previousUndoStepId !== undefined &&
    previousUndoStepId !== currentUndoStepId
  ) {
    // Selecting with different undo step ID
    return mergeIntoLastStep(steps, lastStep, op)
  }

  // Handle case when both IDs are undefined
  if (currentUndoStepId === undefined && previousUndoStepId === undefined) {
    if (op.type === 'set.selection') {
      return mergeIntoLastStep(steps, lastStep, op)
    }

    const lastOp = lastStep.operations.at(-1)

    if (
      lastOp &&
      op.type === 'insert.text' &&
      lastOp.type === 'insert.text' &&
      op.offset === lastOp.offset + lastOp.text.length &&
      pathEquals(op.path, lastOp.path) &&
      op.text !== ' '
    ) {
      return mergeIntoLastStep(steps, lastStep, op)
    }

    if (
      lastOp &&
      op.type === 'remove.text' &&
      lastOp.type === 'remove.text' &&
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
      op.type === 'insert.text' &&
      lastOp.type === 'insert.text' &&
      op.offset === lastOp.offset + lastOp.text.length &&
      pathEquals(op.path, lastOp.path) &&
      op.text !== ' '
    ) {
      return mergeIntoLastStep(steps, lastStep, op)
    }

    if (
      lastOp &&
      op.type === 'remove.text' &&
      lastOp.type === 'remove.text' &&
      op.offset + op.text.length === lastOp.offset &&
      pathEquals(op.path, lastOp.path)
    ) {
      return mergeIntoLastStep(steps, lastStep, op)
    }
  }

  // Asymmetric on purpose — the reverse direction (current defined, previous
  // undefined) signals an intentional undo step boundary and stays unmerged.
  if (currentUndoStepId === undefined && previousUndoStepId !== undefined) {
    const lastOp = lastStep.operations.at(-1)

    if (
      lastOp &&
      op.type === 'insert.text' &&
      lastOp.type === 'insert.text' &&
      op.offset === lastOp.offset + lastOp.text.length &&
      pathEquals(op.path, lastOp.path) &&
      op.text !== ' '
    ) {
      return mergeIntoLastStep(steps, lastStep, op)
    }
  }

  return createNewStep(steps, op, selectionBeforeApply)
}

function createNewStep(
  steps: Array<UndoStep>,
  op: EngineOperation,
  selectionBeforeApply: Range | null,
): Array<UndoStep> {
  const operations =
    selectionBeforeApply === null
      ? [op]
      : [
          {
            type: 'set.selection' as const,
            properties: {...selectionBeforeApply},
            newProperties: {...selectionBeforeApply},
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
  op: EngineOperation,
): Array<UndoStep> {
  lastStep.operations.push(op)

  return steps
}
