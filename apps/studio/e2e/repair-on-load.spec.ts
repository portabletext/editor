import {expect, test} from '@playwright/test'
import {
  createClient,
  type ListenEvent,
  type MutationEvent,
} from '@sanity/client'
import {documents} from '../scripts/seed.mjs'

const client = createClient({
  projectId: 'e2sapjbh',
  dataset: 'scratch',
  apiVersion: '2026-01-01',
  token: process.env.SANITY_PTE_LAB_TOKEN,
  useCdn: false,
})

async function resetDoc(id: string) {
  const seed = documents.find((doc) => doc._id === id)
  if (!seed) {
    throw new Error(`no seed document for ${id}`)
  }
  await client.delete(`drafts.${id}`)
  await client.createOrReplace(seed)
}

async function listenFor(id: string, ms: number) {
  const events: MutationEvent[] = []
  const subscription = client
    .listen(
      '*[_id in $ids]',
      {ids: [id, `drafts.${id}`]},
      {includeResult: true, visibility: 'transaction'},
    )
    .subscribe((event: ListenEvent<Record<string, unknown>>) => {
      if (event.type === 'mutation') {
        events.push(event)
      }
    })
  await new Promise((resolve) => setTimeout(resolve, ms))
  subscription.unsubscribe()
  return events
}

// A single Actions API draft-create bundles the server's own array-key
// enrichment (`create` plus `_system.*` bookkeeping patches plus
// index-addressed `_key` sets like `body[0].children[1]._key`) into one
// transaction, ahead of and independent from the editor's own intake
// repair. Grouping by `transactionId` separates that expected server
// transaction from the editor's.
function groupByTransaction(events: MutationEvent[]) {
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

// The editor addresses the repaired block by key (`body[_key=="..."]`),
// unlike the server's index-addressed enrichment (`body[0]...`), so the
// block-level selector alone distinguishes an editor-emitted repair patch
// from the server's.
function hasEditorRepairPatch(transactionEvents: MutationEvent[]) {
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

test.describe.serial('repair-on-load', () => {
  test('structural repair persists exactly once on load', async ({page}) => {
    const id = 'pte-lab.keyless-child'
    await resetDoc(id)

    const eventsPromise = listenFor(id, 40_000)

    await page.goto(`/structure/article;${id}`)
    await expect(page.getByLabel('Title', {exact: false})).toHaveValue(
      'Article with a keyless span child',
    )
    await expect(page.getByText('this one does not')).toBeVisible()

    await expect(page.getByText('Invalid value')).toHaveCount(0)

    const events = await eventsPromise
    const draftEvents = events.filter(
      (event) => event.documentId === `drafts.${id}`,
    )

    expect(draftEvents.length).toBeGreaterThan(0)

    const transactions = groupByTransaction(draftEvents)
    const repairTransactions = transactions.filter(hasEditorRepairPatch)
    expect(repairTransactions).toHaveLength(1)

    const repairTransactionIndex = transactions.indexOf(repairTransactions[0])
    const furtherRepairTransactions = transactions
      .slice(repairTransactionIndex + 1)
      .filter(hasEditorRepairPatch)
    expect(furtherRepairTransactions).toEqual([])

    const draft = await client.getDocument(`drafts.${id}`)
    expect(draft).toBeDefined()
    const body = draft?.body as Array<{
      children: Array<{_key?: string; text: string}>
    }>
    for (const block of body) {
      for (const child of block.children) {
        expect(typeof child._key).toBe('string')
      }
    }
    expect(
      body.flatMap((block) => block.children.map((child) => child.text)),
    ).toEqual(['This span has a `_key`, but ', 'this one does not', '.'])
  })

  test('clean document stays silent', async ({page}) => {
    const id = 'pte-lab.clean'
    await resetDoc(id)

    const eventsPromise = listenFor(id, 12_000)

    await page.goto(`/structure/article;${id}`)
    await expect(page.getByLabel('Title', {exact: false})).toHaveValue(
      'Clean control article',
    )
    await expect(page.getByText('well-formed')).toBeVisible()

    const events = await eventsPromise
    expect(events).toEqual([])

    const draft = await client.getDocument(`drafts.${id}`)
    expect(draft).toBeUndefined()
  })
})
