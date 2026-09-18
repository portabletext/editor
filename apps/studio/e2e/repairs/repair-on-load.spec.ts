import {expect, test} from '@playwright/test'
import {repairsFixtures} from '../../scripts/seed.mjs'
import {createLabClient} from '../support/client'
import {openDocument} from '../support/render-state'
import {resetDoc} from '../support/seed'
import {groupByTransaction, hasEditorRepairPatch} from '../support/transactions'
import {wiretap} from '../support/wiretap'

const client = createLabClient()

test.describe.serial('repair-on-load', () => {
  test('loading a structurally broken document mutates nothing', async ({
    page,
  }) => {
    const id = 'pte-lab.repairs.keyless-child'
    await resetDoc(client, repairsFixtures, id)
    const seeded = await client.getDocument(id)

    const tap = wiretap(client, [id], 40_000)

    await openDocument(page, id)
    await expect(page.getByLabel('Title', {exact: false})).toHaveValue(
      'Article with a keyless span child',
    )
    await expect(page.getByText('this one does not')).toBeVisible()

    await expect(page.getByText('Invalid value')).toHaveCount(0)

    const entries = await tap.done
    const events = entries.map(({event}) => event)

    const transactions = groupByTransaction(events)
    const repairTransactions = transactions.filter(hasEditorRepairPatch)
    expect(repairTransactions).toEqual([])

    const published = await client.getDocument(id)
    expect(published?.body).toEqual(seeded?.body)

    const draft = await client.getDocument(`drafts.${id}`)
    expect(draft?.body ?? seeded?.body).toEqual(seeded?.body)
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
