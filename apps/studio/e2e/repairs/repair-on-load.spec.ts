import {expect, test} from '@playwright/test'
import {repairsFixtures} from '../../scripts/seed.mjs'
import {createLabClient} from '../support/client'
import {openDocument} from '../support/render-state'
import {resetDoc} from '../support/seed'
import {groupByTransaction, hasEditorRepairPatch} from '../support/transactions'
import {wiretap} from '../support/wiretap'

const client = createLabClient()

test.describe.serial('repair-on-load', () => {
  test('structural repair persists exactly once on load', async ({page}) => {
    const id = 'pte-lab.repairs.keyless-child'
    await resetDoc(client, repairsFixtures, id)

    const tap = wiretap(client, [id], 40_000)

    await openDocument(page, id)
    await expect(page.getByLabel('Title', {exact: false})).toHaveValue(
      'Article with a keyless span child',
    )
    await expect(page.getByText('this one does not')).toBeVisible()

    await expect(page.getByText('Invalid value')).toHaveCount(0)

    const entries = await tap.done
    const draftEvents = entries
      .filter(({event}) => event.documentId === `drafts.${id}`)
      .map(({event}) => event)

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
    const id = 'pte-lab.repairs.clean'
    await resetDoc(client, repairsFixtures, id)

    const tap = wiretap(client, [id], 12_000)

    await openDocument(page, id)
    await expect(page.getByLabel('Title', {exact: false})).toHaveValue(
      'Clean control article',
    )
    await expect(page.getByText('well-formed')).toBeVisible()

    const entries = await tap.done
    expect(entries).toEqual([])

    const draft = await client.getDocument(`drafts.${id}`)
    expect(draft).toBeUndefined()
  })
})
