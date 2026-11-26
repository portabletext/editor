import type {Schema} from '@portabletext/schema'
import type {EngineOperation} from '../engine/interfaces/operation'
import type {Point} from '../engine/interfaces/point'
import {pathEquals} from '../engine/path/path-equals'
import {inverseOperation} from '../engine/operation/inverse-operation'
import {transformPoint} from '../engine/point/transform-point'
import {pathContains} from '../traversal/path-contains'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {debug} from './debug'

type History = PortableTextEditorEngine['history']
type HistoryItem = History['undos'][number]

/**
 * Rebase the undo and redo stacks past an operation applied from a remote
 * patch.
 *
 * Each stack is one sequence in replay order: the undo stack replays the
 * inverses of its newest step's operations last to first, then the step
 * below it, and the redo stack replays its top step's operations first to
 * last, then the step below it. Each replayed operation is valid in the
 * document the previous one left, so the remote operation is carried
 * through the sequence in that order: every history operation is rebased
 * past the remote operation as it reads in that operation's document, and
 * the remote operation is then rebased past the history operation for the
 * next one.
 *
 * A step whose every document change is dropped is discarded, so an empty
 * step never blocks either stack.
 */
export function rebaseHistory(
  context: {schema: Schema},
  history: History,
  remoteOperation: EngineOperation,
): Pick<History, 'undos' | 'redos'> {
  return {
    undos: rebaseStack(context, history.undos, remoteOperation, 'undo'),
    redos: rebaseStack(context, history.redos, remoteOperation, 'redo'),
  }
}

function rebaseStack(
  context: {schema: Schema},
  steps: Array<HistoryItem>,
  remoteOperation: EngineOperation,
  direction: 'undo' | 'redo',
): Array<HistoryItem> {
  let rebasedSteps = steps
  let remoteOperations = [remoteOperation]

  for (
    let stepIndex = steps.length - 1;
    stepIndex >= 0 && remoteOperations.length > 0;
    stepIndex--
  ) {
    const step = steps[stepIndex]!
    const replayedOperations =
      direction === 'undo' ? [...step.operations].reverse() : step.operations
    const operations: Array<EngineOperation> = []
    for (const operation of replayedOperations) {
      const transformed = transformSequences(
        context,
        [operation],
        remoteOperations,
        direction,
      )
      operations.push(...transformed.operations)
      remoteOperations = transformed.remoteOperations
    }
    if (direction === 'undo') operations.reverse()
    if (
      operations.length === step.operations.length &&
      operations.every(
        (operation, index) => operation === step.operations[index],
      )
    )
      continue
    if (rebasedSteps === steps) rebasedSteps = [...steps]
    if (
      operations.every((operation) => operation.type === 'set.selection') &&
      step.operations.some((operation) => operation.type !== 'set.selection')
    ) {
      rebasedSteps.splice(stepIndex, 1)
    } else {
      rebasedSteps[stepIndex] = {operations}
    }
  }
  return rebasedSteps
}

function transformSequences(
  context: {schema: Schema},
  operations: Array<EngineOperation>,
  remoteOperations: Array<EngineOperation>,
  direction: 'undo' | 'redo',
): {
  operations: Array<EngineOperation>
  remoteOperations: Array<EngineOperation>
} {
  if (operations.length === 0 || remoteOperations.length === 0)
    return {operations, remoteOperations}
  if (operations.length > 1) {
    const first = transformSequences(
      context,
      [operations[0]!],
      remoteOperations,
      direction,
    )
    const rest = transformSequences(
      context,
      operations.slice(1),
      first.remoteOperations,
      direction,
    )
    return {
      operations: [...first.operations, ...rest.operations],
      remoteOperations: rest.remoteOperations,
    }
  }
  if (remoteOperations.length > 1) {
    const first = transformSequences(
      context,
      operations,
      [remoteOperations[0]!],
      direction,
    )
    const rest = transformSequences(
      context,
      first.operations,
      remoteOperations.slice(1),
      direction,
    )
    return {
      operations: rest.operations,
      remoteOperations: [...first.remoteOperations, ...rest.remoteOperations],
    }
  }
  const operation = operations[0]!
  const remoteOperation = remoteOperations[0]!
  const replayedOperation = replayOperation(operation, direction)
  if (
    replayedOperation &&
    isTextOperation(replayedOperation) &&
    isTextOperation(remoteOperation) &&
    pathEquals(replayedOperation.path, remoteOperation.path)
  ) {
    const transformed = transformTextPair(replayedOperation, remoteOperation)
    return {
      operations:
        direction === 'undo'
          ? transformed.operations.map(inverseOperation)
          : transformed.operations,
      remoteOperations: transformed.remoteOperations,
    }
  }
  const transformed = transformOperation(
    context,
    operation,
    remoteOperation,
    direction,
  )
  return {
    operations: transformed.operation ? [transformed.operation] : [],
    remoteOperations: transformed.remoteOperation
      ? [transformed.remoteOperation]
      : [],
  }
}

type TextOperation = Extract<
  EngineOperation,
  {type: 'insert.text' | 'remove.text'}
>

function isTextOperation(
  operation: EngineOperation,
): operation is TextOperation {
  return operation.type === 'insert.text' || operation.type === 'remove.text'
}

function transformTextPair(
  operation: TextOperation,
  remoteOperation: TextOperation,
) {
  return {
    operations: transformText(operation, remoteOperation, false),
    remoteOperations: transformText(remoteOperation, operation, true),
  }
}

function transformText(
  operation: TextOperation,
  other: TextOperation,
  after: boolean,
): Array<TextOperation> {
  const start = operation.offset
  const otherStart = other.offset
  if (other.type === 'insert.text') {
    if (
      operation.type === 'remove.text' &&
      otherStart > start &&
      otherStart < start + operation.text.length
    ) {
      const split = otherStart - start
      return [
        {
          ...operation,
          offset: otherStart + other.text.length,
          text: operation.text.slice(split),
        },
        {...operation, text: operation.text.slice(0, split)},
      ]
    }
    const offset =
      start > otherStart ||
      (start === otherStart && (operation.type === 'remove.text' || after))
        ? start + other.text.length
        : start
    return [offset === start ? operation : {...operation, offset}]
  }
  const otherEnd = otherStart + other.text.length
  const offset =
    start <= otherStart
      ? start
      : start >= otherEnd
        ? start - other.text.length
        : otherStart
  const text =
    operation.type === 'remove.text' &&
    start < otherEnd &&
    start + operation.text.length > otherStart
      ? operation.text.slice(0, Math.max(0, otherStart - start)) +
        operation.text.slice(Math.max(0, otherEnd - start))
      : operation.text
  return text.length === 0
    ? []
    : [
        offset === start && text === operation.text
          ? operation
          : {...operation, offset, text},
      ]
}

/**
 * Rebase a history operation past a remote operation that addresses the
 * document the operation is replayed in, and the remote operation past the
 * replayed operation, so it addresses the document the next replayed
 * operation sees. `remoteOperation` is `undefined` once it can no longer
 * reach earlier documents (it edits a node the replayed operation removes).
 *
 * With keyed paths, block-level path adjustments are no-ops because keys
 * are stable across insertions and removals. Operations inside a remotely
 * removed subtree are dropped. Text offsets and selection points are mapped
 * in UTF-16 code units. Text ranges are split by `transformSequences` before
 * individual operations reach this function.
 */
export function transformOperation(
  context: {schema: Schema},
  operation: EngineOperation,
  remoteOperation: EngineOperation,
  direction: 'undo' | 'redo',
): {
  operation: EngineOperation | undefined
  remoteOperation: EngineOperation | undefined
} {
  if (
    (remoteOperation.type === 'unset' || remoteOperation.type === 'set') &&
    'path' in operation &&
    pathContains(
      remoteOperation.path,
      isTextOperation(operation) ? [...operation.path, 'text'] : operation.path,
    )
  ) {
    debug.history('Skipping transformation that targeted removed node')
    return {operation: undefined, remoteOperation}
  }

  if (operation.type === 'set.selection') {
    const properties = transformRange(
      context,
      operation.properties,
      remoteOperation,
    )
    const newProperties = transformRange(
      context,
      operation.newProperties,
      remoteOperation,
    )

    return {
      operation:
        properties === operation.properties &&
        newProperties === operation.newProperties
          ? operation
          : ({...operation, properties, newProperties} as EngineOperation),
      remoteOperation,
    }
  }

  const replayedOperation = replayOperation(operation, direction)

  if (replayedOperation === undefined) {
    return {operation, remoteOperation}
  }

  if (operation.type === 'insert.text' || operation.type === 'remove.text') {
    // At a remote insert's offset, a replayed insert lands in front of it
    // and a replayed removal starts after it, and the remote insert is
    // carried past the replayed operation the complementary way below.
    const start = {path: operation.path, offset: operation.offset}
    const point = transformPoint(context, start, remoteOperation, {
      affinity:
        replayedOperation.type === 'insert.text' ? 'backward' : 'forward',
    })

    if (point === null) {
      return {operation: undefined, remoteOperation}
    }

    return {
      operation:
        point === start
          ? operation
          : {...operation, path: point.path, offset: point.offset},
      remoteOperation: transformRemoteOperation(
        context,
        remoteOperation,
        replayedOperation,
      ),
    }
  }

  return {
    operation,
    remoteOperation: transformRemoteOperation(
      context,
      remoteOperation,
      replayedOperation,
    ),
  }
}

/**
 * The operation as undo or redo applies it. Structural operations without
 * inverse data are never recorded, but the rebase runs while a remote patch
 * is applied, so a missing inverse leaves the remote operation as is
 * instead of throwing.
 */
function replayOperation(
  operation: EngineOperation,
  direction: 'undo' | 'redo',
): EngineOperation | undefined {
  if (direction === 'redo') {
    return operation
  }

  if (
    (operation.type === 'insert' ||
      operation.type === 'set' ||
      operation.type === 'unset') &&
    !operation.inverse
  ) {
    return undefined
  }

  return inverseOperation(operation)
}

function transformRemoteOperation(
  context: {schema: Schema},
  remoteOperation: EngineOperation,
  replayedOperation: EngineOperation,
): EngineOperation | undefined {
  if (
    remoteOperation.type === 'insert.text' ||
    remoteOperation.type === 'remove.text'
  ) {
    const point = transformPoint(
      context,
      {path: remoteOperation.path, offset: remoteOperation.offset},
      replayedOperation,
      {affinity: 'forward'},
    )

    return point === null
      ? undefined
      : {...remoteOperation, path: point.path, offset: point.offset}
  }

  if (
    'path' in remoteOperation &&
    replayedOperation.type === 'unset' &&
    isKeyedSegment(replayedOperation.path.at(-1)) &&
    pathContains(replayedOperation.path, remoteOperation.path)
  ) {
    return undefined
  }

  return remoteOperation
}

function transformRange<TRange extends {anchor?: Point; focus?: Point} | null>(
  context: {schema: Schema},
  range: TRange,
  remoteOperation: EngineOperation,
): TRange {
  if (range === null) {
    return range
  }

  const anchor = range.anchor
    ? transformSelectionPoint(context, range.anchor, remoteOperation)
    : range.anchor
  const focus = range.focus
    ? transformSelectionPoint(context, range.focus, remoteOperation)
    : range.focus

  if (anchor === range.anchor && focus === range.focus) {
    return range
  }

  return {...range, anchor, focus}
}

function transformSelectionPoint(
  context: {schema: Schema},
  point: Point,
  remoteOperation: EngineOperation,
): Point {
  return (
    transformPoint(context, point, remoteOperation, {affinity: 'backward'}) ??
    point
  )
}
