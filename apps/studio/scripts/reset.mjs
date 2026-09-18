import {createClient} from '@sanity/client'
import {fixtureGroups} from './seed.mjs'

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

const familyPrefixes = Object.keys(fixtureGroups).map(
  (family) => `pte-lab.${family}`,
)
const pathFilters = familyPrefixes.flatMap((prefix) => [
  `_id in path("${prefix}.**")`,
  `_id in path("drafts.${prefix}.**")`,
])

// The client's API version defaults to the `published` perspective, which
// hides `drafts.*` from GROQ; without `raw` this cleanup strands drafts.
const ids = await client.fetch(
  `*[${pathFilters.join(' || ')}]._id`,
  {},
  {
    perspective: 'raw',
  },
)

if (ids.length === 0) {
  console.log('no fixture documents found, nothing to delete')
  process.exit(0)
}

const transaction = ids.reduce((tx, id) => tx.delete(id), client.transaction())
await transaction.commit()

console.log(`deleted ${ids.length} document(s):`)
for (const id of ids) {
  console.log(`  ${id}`)
}
