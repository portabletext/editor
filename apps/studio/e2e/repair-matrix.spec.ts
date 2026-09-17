import {writeFile} from 'node:fs/promises'
import {expect, test} from '@playwright/test'
import {
  createClient,
  type ListenEvent,
  type MutationEvent,
} from '@sanity/client'
import {documents} from '../scripts/seed.mjs'

// This spec is measurement only: it records what the repair-on-load path
// actually does for every structural defect class in `documents`, without
// asserting a desired mutation count. The known-storm classes are expected
// to fire more than one transaction; this pins the observed shape of that
// storm (counts, timing, whether transactions repeatedly touch the same
// path) so a later fix has a before/after baseline, rather than pinning a
// specific count as "correct".

const RESULTS_PATH = '/tmp/repair-matrix-results.json'
const LISTEN_WINDOW_MS = 25_000
const RENDER_STATE_TIMEOUT_MS = 15_000

const client = createClient({
  projectId: 'e2sapjbh',
  dataset: 'scratch',
  apiVersion: '2026-01-01',
  token: process.env.SANITY_PTE_LAB_TOKEN,
  useCdn: false,
})

// Notes below are the 3246 spec's expectations, recorded for the report;
// this spec measures rather than enforces them.
const EXPECTATIONS: Record<string, string> = {
  'pte-lab.keyless-child':
    'known storm of 2-3 transactions rewriting the same childs _key (repair-on-load.spec.ts); re-measured here against the current build.',
  'pte-lab.keyless-block':
    'repair expected, but a top-level keyless array item trips Studios own "Missing keys" array-input guard before the PTE engine mounts, so no repair mutation fires without a manual "Add missing keys" click.',
  'pte-lab.duplicate-keys':
    'repair expected, but a duplicate key on a top-level block trips Studios own "Non-unique keys" array-input guard before the PTE engine mounts, so no repair mutation fires without a manual "Generate unique keys" click.',
  'pte-lab.empty-children':
    'repair expected (filler span inserted into the empty children array).',
  'pte-lab.orphan-markdefs':
    'no intake repair: markDefs are pruned only on the next local edit, not on load. Expect zero mutations.',
  'pte-lab.clean': 'control. Expect zero mutations.',
}

const DOCUMENT_IDS = [
  'pte-lab.keyless-child',
  'pte-lab.keyless-block',
  'pte-lab.duplicate-keys',
  'pte-lab.empty-children',
  'pte-lab.orphan-markdefs',
  'pte-lab.clean',
]

type RenderState =
  | 'editor'
  | 'missing-keys-guard'
  | 'non-unique-keys-guard'
  | 'unknown'

type PatchSummary = {
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

type TransactionRecord = {
  transactionId: string
  transition: MutationEvent['transition']
  receivedAt: number
  serverTimestamp: string
  patches: PatchSummary[]
}

type RepeatedPath = {
  path: string
  kinds: Array<'set' | 'setIfMissing' | 'diffMatchPatch' | 'insert'>
  transactionIds: string[]
  valuesChanged: boolean
}

type DocumentResult = {
  id: string
  expectation: string
  renderState: RenderState
  transactionCount: number
  interArrivalGapsMs: number[]
  repeatedPaths: RepeatedPath[]
  rekeysSameNode: boolean
  finalDraftExists: boolean
  finalDraftBody: unknown
  transactions: TransactionRecord[]
}

const results: DocumentResult[] = []

async function resetDoc(id: string) {
  const seed = documents.find((doc) => doc._id === id)
  if (!seed) {
    throw new Error(`no seed document for ${id}`)
  }
  await client.delete(`drafts.${id}`)
  await client.createOrReplace(seed)
}

function listenFor(id: string, ms: number) {
  const events: Array<{event: MutationEvent; receivedAt: number}> = []
  const subscription = client
    .listen(
      '*[_id in $ids]',
      {ids: [id, `drafts.${id}`]},
      {includeResult: true, visibility: 'transaction'},
    )
    .subscribe((event: ListenEvent<Record<string, unknown>>) => {
      if (event.type === 'mutation') {
        events.push({event, receivedAt: Date.now()})
      }
    })
  const done = new Promise<typeof events>((resolve) => {
    setTimeout(() => {
      subscription.unsubscribe()
      resolve(events)
    }, ms)
  })
  return done
}

async function waitForRenderState(page: import('@playwright/test').Page) {
  const candidates: Array<[RenderState, ReturnType<typeof page.locator>]> = [
    ['editor', page.locator('[data-slate-editor][contenteditable="true"]')],
    ['missing-keys-guard', page.getByText('Missing keys')],
    ['non-unique-keys-guard', page.getByText('Non-unique keys')],
  ]
  const raced = await Promise.race(
    candidates.map(([label, locator]) =>
      locator
        .first()
        .waitFor({state: 'visible', timeout: RENDER_STATE_TIMEOUT_MS})
        .then(() => label)
        .catch(() => null),
    ),
  )
  if (raced) {
    return raced
  }
  for (const [label, locator] of candidates) {
    if (await locator.first().isVisible().catch(() => false)) {
      return label
    }
  }
  return 'unknown' as const
}

function summarizeMutation(
  mutation: MutationEvent['mutations'][number],
): PatchSummary {
  if ('create' in mutation || 'createOrReplace' in mutation || 'createIfNotExists' in mutation) {
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
  const diffMatchPatch = (patch.diffMatchPatch ?? {}) as Record<
    string,
    unknown
  >
  const insert = patch.insert as
    | {before?: string; after?: string; replace?: string; items?: Array<{_key?: string}>}
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

// System bookkeeping fields fork on every draft creation regardless of
// content shape; excluding them keeps the repeated-path signal limited to
// actual body repair activity.
const SYSTEM_PATHS = new Set([
  '_system.base.id',
  '_system.base.rev',
  '_empty_action_guard_pseudo_field_',
])

// Grouped by literal path only (not by operation kind): a `set` on a path
// in one transaction followed by a `diffMatchPatch` on the same literal
// path in a later transaction is the same node being rewritten twice, just
// through two different patch operations, and must land in the same group.
function findRepeatedPaths(transactions: TransactionRecord[]): RepeatedPath[] {
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

test.describe.serial('repair matrix', () => {
  for (const id of DOCUMENT_IDS) {
    test(`records observed repair mutations for ${id}`, async ({page}) => {
      const seed = documents.find((doc) => doc._id === id)
      if (!seed) {
        throw new Error(`no seed document for ${id}`)
      }

      await resetDoc(id)

      const eventsPromise = listenFor(id, LISTEN_WINDOW_MS)

      await page.goto(`/structure/article;${id}`)
      await expect(page.getByLabel('Title', {exact: false})).toHaveValue(
        seed.title as string,
      )

      const renderState = await waitForRenderState(page)

      const rawEvents = await eventsPromise
      const draftEvents = rawEvents
        .filter(({event}) => event.documentId === `drafts.${id}`)
        .sort((a, b) => a.receivedAt - b.receivedAt)

      const transactions: TransactionRecord[] = draftEvents.map(
        ({event, receivedAt}) => ({
          transactionId: event.transactionId,
          transition: event.transition,
          receivedAt,
          serverTimestamp: event.timestamp,
          patches: event.mutations.map(summarizeMutation),
        }),
      )

      const interArrivalGapsMs = transactions
        .slice(1)
        .map((transaction, index) => transaction.receivedAt - transactions[index].receivedAt)

      const draft = await client.getDocument(`drafts.${id}`)

      results.push({
        id,
        expectation: EXPECTATIONS[id],
        renderState,
        transactionCount: transactions.length,
        interArrivalGapsMs,
        repeatedPaths: findRepeatedPaths(transactions),
        rekeysSameNode: findRepeatedPaths(transactions).length > 0,
        finalDraftExists: draft !== undefined,
        finalDraftBody: draft?.body ?? null,
        transactions,
      })

      // The only universal assertion here is that the document opened; the
      // mutation counts and shapes above are recorded, not enforced.
      expect(renderState).not.toBe('unknown')
    })
  }

  test.afterAll(async () => {
    await writeFile(RESULTS_PATH, JSON.stringify(results, null, 2))
  })
})
