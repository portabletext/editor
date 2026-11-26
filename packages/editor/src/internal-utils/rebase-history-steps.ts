import {mapPoint, mapRange, type Step} from '@portabletext/steps'
import type {EngineOperation} from '../engine/interfaces/operation'
import {inverseOperation} from '../engine/operation/inverse-operation'
import {pathEquals} from '../engine/path/path-equals'
import {pathContains} from '../traversal/path-contains'
import type {PortableTextEditorEngine} from '../types/editor-engine'

type History = PortableTextEditorEngine['history']
type TextStep = Extract<Step, {type: 'insert.text' | 'remove.text'}>

export function rebaseHistorySteps(
  history: History,
  changes: ReadonlyArray<Step>,
): History {
  return {
    undos: rebaseStack(history.undos, changes, 'undo'),
    redos: rebaseStack(history.redos, changes, 'redo'),
  }
}

function rebaseStack(
  stack: History['undos'],
  changes: ReadonlyArray<Step>,
  direction: 'undo' | 'redo',
) {
  let remote = [...changes]
  const output = [...stack]
  for (let index = stack.length - 1; index >= 0; index--) {
    const item = stack[index]!
    const operations: EngineOperation[] = []
    for (const stored of direction === 'undo'
      ? [...item.operations].reverse()
      : item.operations) {
      const replayed = direction === 'undo' ? inverseOperation(stored) : stored
      const result = transformSequence([replayed], remote)
      operations.push(
        ...(direction === 'undo'
          ? result.operations.map((operation) =>
              restoreInverse(operation, stored),
            )
          : result.operations),
      )
      remote = result.remote
    }
    if (direction === 'undo') operations.reverse()
    output[index] = {operations}
  }
  return output.filter((item) =>
    item.operations.some((operation) => operation.type !== 'set.selection'),
  )
}

function restoreInverse(
  replayed: EngineOperation,
  stored: EngineOperation,
): EngineOperation {
  if (
    replayed.type === 'insert.text' ||
    replayed.type === 'remove.text' ||
    replayed.type === 'set.selection' ||
    replayed.inverse
  )
    return inverseOperation(replayed)
  if (stored.type === 'insert' && replayed.type === 'unset')
    return {...stored, inverse: {type: 'unset', path: replayed.path}}
  if (stored.type === 'unset' && replayed.type === 'insert')
    return {
      ...stored,
      inverse: {
        type: 'insert',
        path: replayed.path,
        node: replayed.node,
        position: replayed.position,
      },
    }
  return stored
}

function transformSequence(
  operations: EngineOperation[],
  remote: Step[],
): {operations: EngineOperation[]; remote: Step[]} {
  if (!operations.length || !remote.length) return {operations, remote}
  if (operations.length > 1) {
    const first = transformSequence([operations[0]!], remote)
    const rest = transformSequence(operations.slice(1), first.remote)
    return {
      operations: [...first.operations, ...rest.operations],
      remote: rest.remote,
    }
  }
  if (remote.length > 1) {
    const first = transformSequence(operations, [remote[0]!])
    const rest = transformSequence(first.operations, remote.slice(1))
    return {
      operations: rest.operations,
      remote: [...first.remote, ...rest.remote],
    }
  }
  const operation = operations[0]!
  const step = remote[0]!
  const mapped = mapOperation(operation, step)
  return {operations: mapped, remote: carryStep(step, operation)}
}

function mapOperation(
  operation: EngineOperation,
  step: Step,
): EngineOperation[] {
  if (operation.type === 'set.selection') {
    const map = (range: typeof operation.properties) => {
      if (!range) return range
      if (range.anchor && range.focus)
        return mapRange([step], {anchor: range.anchor, focus: range.focus})
      return {
        ...range,
        ...(range.anchor
          ? {
              anchor:
                mapPoint([step], range.anchor, {affinity: 'backward'}) ??
                undefined,
            }
          : {}),
        ...(range.focus
          ? {
              focus:
                mapPoint([step], range.focus, {affinity: 'backward'}) ??
                undefined,
            }
          : {}),
      }
    }
    return [
      {
        ...operation,
        properties: map(operation.properties),
        newProperties: map(operation.newProperties),
      } as EngineOperation,
    ]
  }
  if (step.type === 'remove.node' && pathContains(step.path, operation.path))
    return []
  if (operation.type === 'insert.text' || operation.type === 'remove.text') {
    if (
      (step.type === 'insert.text' || step.type === 'remove.text') &&
      pathEquals(operation.path, step.path)
    ) {
      return transformInterval(
        {...operation, length: operation.text.length},
        step,
        false,
      ).map((piece) => ({
        ...operation,
        offset: piece.offset,
        text: operation.text.slice(
          piece.sourceOffset,
          piece.sourceOffset + piece.length,
        ),
      }))
    }
    if (operation.type === 'insert.text') {
      const point = mapPoint(
        [step],
        {path: operation.path, offset: operation.offset},
        {affinity: 'backward'},
      )
      return point ? [{...operation, ...point}] : []
    }
    const boundaries = [
      operation.offset,
      operation.offset + operation.text.length,
    ]
    if (
      step.type === 'move.text' &&
      pathEquals(step.from.path, operation.path)
    ) {
      for (const offset of [
        step.from.offset,
        step.from.offset + step.from.length,
      ])
        if (offset > boundaries[0]! && offset < boundaries[1]!)
          boundaries.push(offset)
    }
    boundaries.sort((first, second) => first - second)
    const pieces: EngineOperation[] = []
    for (let index = 0; index < boundaries.length - 1; index++) {
      const start = boundaries[index]!
      const end = boundaries[index + 1]!
      const range = mapRange([step], {
        anchor: {path: operation.path, offset: start},
        focus: {path: operation.path, offset: end},
      })
      if (
        range &&
        pathEquals(range.anchor.path, range.focus.path) &&
        range.focus.offset > range.anchor.offset
      )
        pieces.unshift({
          ...operation,
          path: range.anchor.path,
          offset: range.anchor.offset,
          text: operation.text.slice(
            start - operation.offset,
            end - operation.offset,
          ),
        })
    }
    return pieces
  }
  const point = mapPoint([step], {path: operation.path, offset: 0})
  if (!point) return []
  const inverse = operation.inverse
    ? {
        ...operation.inverse,
        path:
          mapPoint([step], {path: operation.inverse.path, offset: 0})?.path ??
          operation.inverse.path,
      }
    : undefined
  return [
    {
      ...operation,
      path: point.path,
      ...(inverse ? {inverse} : {}),
    } as EngineOperation,
  ]
}

function carryStep(step: Step, operation: EngineOperation): Step[] {
  if (operation.type === 'set.selection') return [step]
  if (
    operation.type === 'unset' &&
    pathContains(
      operation.path,
      'path' in step
        ? step.path
        : step.from instanceof Array
          ? step.from
          : step.from.path,
    )
  )
    return []
  if (operation.type !== 'insert.text' && operation.type !== 'remove.text')
    return [step]
  const local: TextStep = {
    type: operation.type,
    path: stepPath(operation.path),
    offset: operation.offset,
    length: operation.text.length,
  }
  if (
    (step.type === 'insert.text' || step.type === 'remove.text') &&
    pathEquals(step.path, operation.path)
  ) {
    return transformInterval(step, local, true).map(({offset, length}) => ({
      ...step,
      offset,
      length,
    }))
  }
  if (step.type === 'insert.text' || step.type === 'remove.text') {
    const point = mapPoint([local], {path: step.path, offset: step.offset})
    return point ? [{...step, ...point, path: stepPath(point.path)}] : []
  }
  if (step.type === 'move.text') {
    const from = mapRange([local], {
      anchor: {path: step.from.path, offset: step.from.offset},
      focus: {
        path: step.from.path,
        offset: step.from.offset + step.from.length,
      },
    })
    const to = mapPoint([local], step.to)
    return from && to
      ? [
          {
            ...step,
            from: {
              ...from.anchor,
              path: stepPath(from.anchor.path),
              length: from.focus.offset - from.anchor.offset,
            },
            to: {...to, path: stepPath(to.path)},
          },
        ]
      : []
  }
  return [step]
}

function transformInterval(
  operation: {
    type: 'insert.text' | 'remove.text'
    offset: number
    length: number
  },
  other: TextStep,
  after: boolean,
): Array<{offset: number; length: number; sourceOffset: number}> {
  const start = operation.offset
  const end = start + operation.length
  if (other.type === 'insert.text') {
    if (
      operation.type === 'remove.text' &&
      other.offset > start &&
      other.offset < end
    )
      return [
        {
          offset: other.offset + other.length,
          length: end - other.offset,
          sourceOffset: other.offset - start,
        },
        {offset: start, length: other.offset - start, sourceOffset: 0},
      ]
    const point = mapPoint(
      [other],
      {path: other.path, offset: start},
      {
        affinity:
          operation.type === 'remove.text' || after ? 'forward' : 'backward',
      },
    )!
    return [{offset: point.offset, length: operation.length, sourceOffset: 0}]
  }
  const point = mapPoint(
    [other],
    {path: other.path, offset: start},
    {affinity: 'backward'},
  )!
  if (operation.type === 'insert.text')
    return [{offset: point.offset, length: operation.length, sourceOffset: 0}]
  const beforeLength = Math.max(0, Math.min(end, other.offset) - start)
  const afterStart = Math.max(start, other.offset + other.length)
  const afterLength = Math.max(0, end - afterStart)
  if (beforeLength + afterLength === operation.length)
    return [{offset: point.offset, length: operation.length, sourceOffset: 0}]
  return [
    ...(afterLength
      ? [
          {
            offset: point.offset + beforeLength,
            length: afterLength,
            sourceOffset: afterStart - start,
          },
        ]
      : []),
    ...(beforeLength
      ? [{offset: point.offset, length: beforeLength, sourceOffset: 0}]
      : []),
  ]
}

function stepPath(
  path: import('../engine/interfaces/path').Path,
): TextStep['path'] {
  const result: TextStep['path'] = []
  for (const segment of path) {
    if (Array.isArray(segment))
      throw new Error('History paths must address a node')
    result.push(segment)
  }
  return result
}
