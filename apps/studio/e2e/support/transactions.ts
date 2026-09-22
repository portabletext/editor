import type {MutationEvent} from '@sanity/client'

/**
 * A single Actions API draft-create bundles the server's own array-key
 * enrichment (`create` plus `_system.*` bookkeeping patches plus
 * index-addressed `_key` sets like `body[0].children[1]._key`) into one
 * transaction, ahead of and independent from the editor's own intake
 * repair. Grouping by `transactionId` separates that expected server
 * transaction from the editor's.
 */
export function groupByTransaction(events: MutationEvent[]) {
  const order: string[] = []
  const byTransactionId = new Map<string, MutationEvent[]>()
  for (const event of events) {
    if (!byTransactionId.has(event.transactionId)) {
      order.push(event.transactionId)
      byTransactionId.set(event.transactionId, [])
    }
    byTransactionId.get(event.transactionId)?.push(event)
  }
  return order.map((transactionId) => byTransactionId.get(transactionId) ?? [])
}

/**
 * The editor addresses the repaired block by key (`body[_key=="..."]`),
 * unlike the server's index-addressed enrichment (`body[0]...`), so the
 * block-level selector alone distinguishes an editor-emitted repair patch
 * from the server's.
 */
export function hasEditorRepairPatch(transactionEvents: MutationEvent[]) {
  return transactionEvents.some((event) =>
    event.mutations.some((mutation) => {
      if (!('patch' in mutation)) {
        return false
      }
      const patch = mutation.patch as {
        set?: Record<string, unknown>
        diffMatchPatch?: Record<string, unknown>
      }
      const paths = [
        ...Object.keys(patch.set ?? {}),
        ...Object.keys(patch.diffMatchPatch ?? {}),
      ]
      return paths.some(
        (path) => path.startsWith('body[_key==') && path.endsWith('._key'),
      )
    }),
  )
}

export type PatchSummary = {
  isCreate: boolean
  isDelete: boolean
  set: string[]
  setValues: Record<string, unknown>
  unset: string[]
  setIfMissing: string[]
  diffMatchPatch: string[]
  insertPaths: string[]
  insertItemKeys: string[]
}

export function summarizeMutation(
  mutation: MutationEvent['mutations'][number],
): PatchSummary {
  if (
    'create' in mutation ||
    'createOrReplace' in mutation ||
    'createIfNotExists' in mutation
  ) {
    return {
      isCreate: true,
      isDelete: false,
      set: [],
      setValues: {},
      unset: [],
      setIfMissing: [],
      diffMatchPatch: [],
      insertPaths: [],
      insertItemKeys: [],
    }
  }
  if ('delete' in mutation) {
    return {
      isCreate: false,
      isDelete: true,
      set: [],
      setValues: {},
      unset: [],
      setIfMissing: [],
      diffMatchPatch: [],
      insertPaths: [],
      insertItemKeys: [],
    }
  }
  const patch = mutation.patch as Record<string, unknown>
  const set = (patch.set ?? {}) as Record<string, unknown>
  const setIfMissing = (patch.setIfMissing ?? {}) as Record<string, unknown>
  const diffMatchPatch = (patch.diffMatchPatch ?? {}) as Record<string, unknown>
  const insert = patch.insert as
    | {
        before?: string
        after?: string
        replace?: string
        items?: Array<{_key?: string}>
      }
    | undefined
  const insertTarget = insert?.before ?? insert?.after ?? insert?.replace
  return {
    isCreate: false,
    isDelete: false,
    set: Object.keys(set),
    setValues: set,
    unset: (patch.unset as string[] | undefined) ?? [],
    setIfMissing: Object.keys(setIfMissing),
    diffMatchPatch: Object.keys(diffMatchPatch),
    insertPaths: insertTarget ? [insertTarget] : [],
    insertItemKeys: (insert?.items ?? [])
      .map((item) => item._key)
      .filter((key): key is string => typeof key === 'string'),
  }
}

export type TransactionRecord = {
  transactionId: string
  transition: MutationEvent['transition']
  receivedAt: number
  serverTimestamp: string
  patches: PatchSummary[]
}

export type RepeatedPath = {
  path: string
  kinds: Array<'set' | 'setIfMissing' | 'diffMatchPatch' | 'insert'>
  transactionIds: string[]
  valuesChanged: boolean
}

/**
 * System bookkeeping fields fork on every draft creation regardless of
 * content shape; excluding them keeps the repeated-path signal limited to
 * actual body repair activity.
 */
const SYSTEM_PATHS = new Set([
  '_system.base.id',
  '_system.base.rev',
  '_empty_action_guard_pseudo_field_',
])

/**
 * Grouped by literal path only (not by operation kind): a `set` on a path
 * in one transaction followed by a `diffMatchPatch` on the same literal
 * path in a later transaction is the same node being rewritten twice, just
 * through two different patch operations, and must land in the same group.
 */
export function findRepeatedPaths(
  transactions: TransactionRecord[],
): RepeatedPath[] {
  const touches = new Map<
    string,
    Array<{
      transactionId: string
      kind: RepeatedPath['kinds'][number]
      value: unknown
    }>
  >()
  const record = (
    transactionId: string,
    kind: RepeatedPath['kinds'][number],
    path: string,
    value: unknown,
  ) => {
    if (SYSTEM_PATHS.has(path)) return
    const list = touches.get(path) ?? []
    list.push({transactionId, kind, value})
    touches.set(path, list)
  }
  for (const transaction of transactions) {
    for (const patch of transaction.patches) {
      for (const path of patch.set) {
        record(transaction.transactionId, 'set', path, patch.setValues[path])
      }
      for (const path of patch.setIfMissing) {
        record(transaction.transactionId, 'setIfMissing', path, undefined)
      }
      for (const path of patch.diffMatchPatch) {
        record(transaction.transactionId, 'diffMatchPatch', path, undefined)
      }
      for (const path of patch.insertPaths) {
        record(transaction.transactionId, 'insert', path, patch.insertItemKeys)
      }
    }
  }
  const repeated: RepeatedPath[] = []
  for (const [path, list] of touches) {
    const distinctTransactionIds = [
      ...new Set(list.map((touch) => touch.transactionId)),
    ]
    if (distinctTransactionIds.length < 2) continue
    const distinctValues = new Set(
      list.map((touch) => JSON.stringify(touch.value)),
    )
    repeated.push({
      path,
      kinds: [...new Set(list.map((touch) => touch.kind))],
      transactionIds: distinctTransactionIds,
      valuesChanged: distinctValues.size > 1,
    })
  }
  return repeated
}
