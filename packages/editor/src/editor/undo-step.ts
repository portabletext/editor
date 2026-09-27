import type {EngineOperation} from '../engine/interfaces/operation'
import type {Range} from '../engine/interfaces/range'
import {pathEquals} from '../engine/path/path-equals'

type UndoStep = {
  operations: Array<EngineOperation>
  timestamp: Date
  lastUndoStepId: string | undefined
}

export function createUndoSteps({
  steps,
  op,
  currentUndoStepId,
  operationsInProgress,
  isInNormalization,
  selectionBeforeApply,
}: {
  steps: Array<UndoStep>
  op: EngineOperation
  currentUndoStepId: string | undefined
  /** Snapshots of pre-apply editor state — volatile during apply. */
  operationsInProgress: boolean
  isInNormalization: boolean
  selectionBeforeApply: Range | null
}): Array<UndoStep> {
  const lastStep = steps.at(-1)

  if (!lastStep) {
    return createNewStep(steps, op, currentUndoStepId, selectionBeforeApply)
  }

  const lastStepUndoStepId = lastStep.lastUndoStepId

  if (operationsInProgress) {
    // The editor had operations in progress when apply started.

    if (currentUndoStepId === lastStepUndoStepId || isInNormalization) {
      return mergeIntoLastStep(steps, lastStep, op, currentUndoStepId)
    }

    return createNewStep(steps, op, currentUndoStepId, selectionBeforeApply)
  }

  if (
    op.type === 'set.selection' &&
    currentUndoStepId === undefined &&
    lastStepUndoStepId !== undefined
  ) {
    // Selecting without undo step ID
    return mergeIntoLastStep(steps, lastStep, op, currentUndoStepId)
  }

  if (
    op.type === 'set.selection' &&
    currentUndoStepId !== undefined &&
    lastStepUndoStepId !== undefined &&
    lastStepUndoStepId !== currentUndoStepId
  ) {
    // Selecting with different undo step ID
    return mergeIntoLastStep(steps, lastStep, op, currentUndoStepId)
  }

  // Handle case when both IDs are undefined
  if (currentUndoStepId === undefined && lastStepUndoStepId === undefined) {
    if (op.type === 'set.selection') {
      return mergeIntoLastStep(steps, lastStep, op, currentUndoStepId)
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
      return mergeIntoLastStep(steps, lastStep, op, currentUndoStepId)
    }

    if (
      lastOp &&
      op.type === 'remove.text' &&
      lastOp.type === 'remove.text' &&
      op.offset + op.text.length === lastOp.offset &&
      pathEquals(op.path, lastOp.path)
    ) {
      return mergeIntoLastStep(steps, lastStep, op, currentUndoStepId)
    }

    return createNewStep(steps, op, currentUndoStepId, selectionBeforeApply)
  }

  // Handle case when both IDs are defined but different (e.g., consecutive
  // forwarded insert.text events where each send gets a unique ID)
  if (
    currentUndoStepId !== undefined &&
    lastStepUndoStepId !== undefined &&
    currentUndoStepId !== lastStepUndoStepId
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
      return mergeIntoLastStep(steps, lastStep, op, currentUndoStepId)
    }

    if (
      lastOp &&
      op.type === 'remove.text' &&
      lastOp.type === 'remove.text' &&
      op.offset + op.text.length === lastOp.offset &&
      pathEquals(op.path, lastOp.path)
    ) {
      return mergeIntoLastStep(steps, lastStep, op, currentUndoStepId)
    }
  }

  // Asymmetric on purpose — the reverse direction (current defined, last step
  // undefined) signals an intentional undo step boundary and stays unmerged.
  if (currentUndoStepId === undefined && lastStepUndoStepId !== undefined) {
    const lastOp = lastStep.operations.at(-1)

    if (
      lastOp &&
      op.type === 'insert.text' &&
      lastOp.type === 'insert.text' &&
      op.offset === lastOp.offset + lastOp.text.length &&
      pathEquals(op.path, lastOp.path) &&
      op.text !== ' '
    ) {
      return mergeIntoLastStep(steps, lastStep, op, currentUndoStepId)
    }
  }

  return createNewStep(steps, op, currentUndoStepId, selectionBeforeApply)
}

function createNewStep(
  steps: Array<UndoStep>,
  op: EngineOperation,
  lastUndoStepId: string | undefined,
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
    lastUndoStepId,
  })

  return steps
}

function mergeIntoLastStep(
  steps: Array<UndoStep>,
  lastStep: UndoStep,
  op: EngineOperation,
  currentUndoStepId: string | undefined,
): Array<UndoStep> {
  lastStep.operations.push(op)

  if (op.type !== 'set.selection') {
    lastStep.lastUndoStepId = currentUndoStepId
  }

  return steps
}
