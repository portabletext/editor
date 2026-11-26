import {vi} from 'vitest'
import {getOrigin} from '../src/engine/core/apply-context'
import {subscribeToOperations} from '../src/engine/core/operation-channel'
import {safeStringify} from '../src/internal-utils/safe-json'

vi.mock('../src/editor/create-editor-engine', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/editor/create-editor-engine')>()
  return {
    ...actual,
    createEditorEngine: (
      ...args: Parameters<typeof actual.createEditorEngine>
    ) => {
      const engine = actual.createEditorEngine(...args)
      install(engine)
      return engine
    },
  }
})

vi.mock('../src/engine/operation/inverse-operation', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('../src/engine/operation/inverse-operation')
    >()
  return {
    ...actual,
    inverseOperation: (operation: any) => ({
      ...actual.inverseOperation(operation),
      __gap: operation.__inverseGap,
      __inverseGap: operation.__gap,
    }),
  }
})

vi.mock(
  '../src/internal-utils/rebase-history-steps',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('../src/internal-utils/rebase-history-steps')
      >()
    return {
      ...actual,
      rebaseHistorySteps: (history: any, changes: any[]) => {
        if ((globalThis as any).__historyNeighbourPositions === false) {
          return actual.rebaseHistorySteps(history, changes)
        }
        for (const stack of [history.undos, history.redos]) {
          for (const item of stack) {
            for (const operation of item.operations) {
              for (const gap of [operation.__gap, operation.__inverseGap]) {
                if (gap) {
                  updateGap(gap, changes)
                }
              }
              if (
                operation.inverse?.type === 'insert' &&
                operation.__inverseGap
              ) {
                operation.__originalInversePath = operation.inverse.path
                operation.inverse = {
                  ...operation.inverse,
                  path: [
                    ...operation.__inverseGap.parent,
                    {_key: '__history_gap__'},
                  ],
                }
              }
              if (operation.type === 'insert' && operation.__gap) {
                operation.__originalPath = operation.path
                operation.path = [
                  ...operation.__gap.parent,
                  {_key: '__history_gap__'},
                ]
              }
            }
          }
        }
        const result = actual.rebaseHistorySteps(history, changes)
        for (const stack of [result.undos, result.redos]) {
          for (const item of stack) {
            for (const operation of item.operations as any[]) {
              if (operation.__originalPath) {
                operation.path = operation.__originalPath
              }
              if (operation.__originalInversePath && operation.inverse) {
                operation.inverse.path = operation.__originalInversePath
              }
            }
          }
        }
        return result
      },
    }
  },
)

function install(engine: any) {
  subscribeToOperations(engine, (event) => {
    if (
      event.origin !== 'local' ||
      (globalThis as any).__historyNeighbourPositions === false
    ) {
      return
    }
    const operation: any = event.operation
    if (operation.type === 'insert') {
      operation.__gap = gapAt(
        event.beforeValue,
        operation.path,
        operation.position,
      )
    }
    if (operation.type === 'unset' && operation.inverse?.type === 'insert') {
      operation.__inverseGap = gapAt(
        event.beforeValue,
        operation.path,
        'before',
        operation.inverse.node._key,
      )
    }
  })
  const apply = engine.apply.bind(engine)
  const liveCopies = new Map<string, any>()
  engine.apply = (operation: any) => {
    const origin = getOrigin(engine.applyContext)
    if (origin !== 'undo' && origin !== 'redo') {
      return apply(operation)
    }
    const value = engine.snapshot.context.value
    const gap = operation.__gap
    if (operation.type === 'insert' && gap) {
      const siblings = read(value, gap.parent) ?? []
      const order =
        gap.preferred === 'before' ? ['before', 'after'] : ['after', 'before']
      const side = order.find((side) =>
        siblings.some((node: any) => node._key === gap[side]),
      )
      operation = {
        ...operation,
        path: [...gap.parent, side ? {_key: gap[side]} : 0],
        position: side ?? 'before',
      }
    }
    if ((globalThis as any).__historyLiveNodes) {
      const stack =
        origin === 'undo' ? engine.history.undos : engine.history.redos
      const item = stack.at(-1)
      const removed = new Set(
        item?.operations
          .filter(
            (stored: any) =>
              stored.type === 'unset' && stored.inverse?.type === 'insert',
          )
          .map((stored: any) => stored.inverse.node._key),
      )
      const inserted = new Set(
        item?.operations
          .filter((stored: any) => stored.type === 'insert')
          .map((stored: any) => stored.node._key),
      )
      const moved = new Set([...removed].filter((key) => inserted.has(key)))
      if (operation.type === 'unset') {
        const live = read(value, operation.path)
        const key = operation.path.at(-1)?._key
        if (moved.has(key) && live) {
          liveCopies.set(key, structuredClone(live))
        } else if (origin === 'undo' && inserted.has(key)) {
          const saved = item.operations.find(
            (stored: any) =>
              stored.type === 'insert' && stored.node._key === key,
          )?.node
          if (safeStringify(live) !== safeStringify(saved)) {
            return
          }
        }
      }
      if (operation.type === 'insert') {
        if (
          moved.has(operation.node._key) &&
          liveCopies.has(operation.node._key)
        ) {
          operation = {...operation, node: liveCopies.get(operation.node._key)}
        } else if (
          read(value, [
            ...operation.path.slice(0, -1),
            {_key: operation.node._key},
          ])
        ) {
          return
        }
      }
    }
    return apply(operation)
  }
}

function read(value: any, path: any[]): any {
  for (const segment of path) {
    value =
      typeof segment === 'object'
        ? value?.find((node: any) => node._key === segment._key)
        : value?.[segment]
  }
  return value
}

function gapAt(value: any, path: any[], position: string, excluded?: string) {
  const parent = path.slice(0, -1)
  const siblings = read(value, parent)
  if (!Array.isArray(siblings)) {
    return undefined
  }
  const segment = path.at(-1)
  const index =
    typeof segment === 'number'
      ? segment
      : siblings.findIndex((node: any) => node._key === segment?._key)
  if (index < 0) {
    return undefined
  }
  const boundary = index + (position === 'after' ? 1 : 0)
  return {
    parent,
    after: siblings
      .slice(0, boundary)
      .filter((node: any) => node._key !== excluded)
      .at(-1)?._key,
    before: siblings.slice(boundary).find((node: any) => node._key !== excluded)
      ?._key,
  }
}

function updateGap(gap: any, changes: any[]) {
  for (const step of changes) {
    if (step.type !== 'remove.node') {
      continue
    }
    const segment = step.path[gap.parent.length]
    if (
      safeStringify(step.path.slice(0, gap.parent.length)) !==
      safeStringify(gap.parent)
    ) {
      continue
    }
    for (const side of ['after', 'before']) {
      if (segment?._key === gap[side]) {
        const nearest = step.nearest?.path[gap.parent.length]
        gap[side] = nearest?._key
        if (step.nearest) {
          gap.preferred = step.nearest.offset === 0 ? 'before' : 'after'
        }
      }
    }
  }
}
