import {mkdir, writeFile} from 'node:fs/promises'
import {dirname} from 'node:path'
import {expect, test} from '@playwright/test'
import type {MutationEvent} from '@sanity/client'
import {repairsFixtures} from '../../scripts/seed.mjs'
import {createLabClient} from '../support/client'
import {openDocument, waitForRenderState} from '../support/render-state'
import type {RenderState} from '../support/render-state'
import {resetDoc} from '../support/seed'
import type {TransactionRecord} from '../support/transactions'
import {findRepeatedPaths, summarizeMutation} from '../support/transactions'
import type {RepeatedPath} from '../support/transactions'
import {wiretap} from '../support/wiretap'

// This spec is measurement only: it records what the repair-on-load path
// actually does for every structural defect class in `repairsFixtures`,
// without asserting a desired mutation count. The known-storm classes are
// expected to fire more than one transaction; this pins the observed shape
// of that storm (counts, timing, whether transactions repeatedly touch the
// same path) so a later fix has a before/after baseline, rather than
// pinning a specific count as "correct".

const RESULTS_PATH =
  process.env.REPAIR_MATRIX_RESULTS_PATH ??
  'test-artifacts/repair-matrix-results.json'
const LISTEN_WINDOW_MS = 25_000

const client = createLabClient()

// Notes below are the 3246 spec's expectations, recorded for the report;
// this spec measures rather than enforces them.
const EXPECTATIONS: Record<string, string> = {
  'pte-lab.repairs.keyless-child':
    'known storm of 2-3 transactions rewriting the same childs _key (repair-on-load.spec.ts); re-measured here against the current build.',
  'pte-lab.repairs.keyless-block':
    'repair expected, but a top-level keyless array item trips Studios own "Missing keys" array-input guard before the PTE engine mounts, so no repair mutation fires without a manual "Add missing keys" click.',
  'pte-lab.repairs.duplicate-keys':
    'repair expected, but a duplicate key on a top-level block trips Studios own "Non-unique keys" array-input guard before the PTE engine mounts, so no repair mutation fires without a manual "Generate unique keys" click.',
  'pte-lab.repairs.empty-children':
    'repair expected (filler span inserted into the empty children array).',
  'pte-lab.repairs.orphan-markdefs':
    'no intake repair: markDefs are pruned only on the next local edit, not on load. Expect zero mutations.',
  'pte-lab.repairs.clean': 'control. Expect zero mutations.',
}

const DOCUMENT_IDS = [
  'pte-lab.repairs.keyless-child',
  'pte-lab.repairs.keyless-block',
  'pte-lab.repairs.duplicate-keys',
  'pte-lab.repairs.empty-children',
  'pte-lab.repairs.orphan-markdefs',
  'pte-lab.repairs.clean',
]

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

test.describe.serial('repair matrix', () => {
  for (const id of DOCUMENT_IDS) {
    test(`records observed repair mutations for ${id}`, async ({page}) => {
      const seed = repairsFixtures.find((doc) => doc._id === id)
      if (!seed) {
        throw new Error(`no seed document for ${id}`)
      }

      await resetDoc(client, repairsFixtures, id)

      const tap = wiretap(client, [id], LISTEN_WINDOW_MS)

      await openDocument(page, id)
      await expect(page.getByLabel('Title', {exact: false})).toHaveValue(
        seed.title as string,
      )

      const renderState = await waitForRenderState(page)

      const entries = await tap.done
      const draftEntries = entries
        .filter(({event}) => event.documentId === `drafts.${id}`)
        .sort((a, b) => a.receivedAt - b.receivedAt)

      const transactions: TransactionRecord[] = draftEntries.map(
        ({event, receivedAt}: {event: MutationEvent; receivedAt: number}) => ({
          transactionId: event.transactionId,
          transition: event.transition,
          receivedAt,
          serverTimestamp: event.timestamp,
          patches: event.mutations.map(summarizeMutation),
        }),
      )

      const interArrivalGapsMs = transactions
        .slice(1)
        .map(
          (transaction, index) =>
            transaction.receivedAt - transactions[index].receivedAt,
        )

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
    await mkdir(dirname(RESULTS_PATH), {recursive: true})
    await writeFile(RESULTS_PATH, JSON.stringify(results, null, 2))
  })
})
