import {createClient} from '@sanity/client'

const token = process.env.SANITY_PTE_LAB_TOKEN

if (!token) {
  console.error(
    'SANITY_PTE_LAB_TOKEN is not set. Run this script with `node --env-file=.env.local scripts/reset.mjs` ' +
      '(via `pnpm --filter studio reset`), with `.env.local` populated from `~/code/@portabletext/.pte-lab.env`.',
  )
  process.exit(1)
}

const client = createClient({
  projectId: 'e2sapjbh',
  dataset: 'scratch',
  apiVersion: '2026-01-01',
  token,
  useCdn: false,
})

const ids = await client.fetch(
  `*[_id in path("pte-lab.**") || _id in path("drafts.pte-lab.**")]._id`,
)

if (ids.length === 0) {
  console.log('no pte-lab.* documents found, nothing to delete')
  process.exit(0)
}

const transaction = ids.reduce((tx, id) => tx.delete(id), client.transaction())
await transaction.commit()

console.log(`deleted ${ids.length} document(s):`)
for (const id of ids) {
  console.log(`  ${id}`)
}
