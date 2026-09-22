import {fileURLToPath} from 'node:url'
import {createClient} from '@sanity/client'

const link = (key, href) => ({_type: 'link', _key: key, href})

const span = (key, text, marks = []) => ({
  _type: 'span',
  _key: key,
  text,
  marks,
})

const textBlock = (key, children, markDefs = []) => ({
  _type: 'block',
  _key: key,
  style: 'normal',
  markDefs,
  children,
})

const callout = (key, text) => ({_type: 'callout', _key: key, text})

const stockTicker = (key, symbol) => ({_type: 'stockTicker', _key: key, symbol})

export const repairsFixtures = [
  {
    _id: 'pte-lab.repairs.clean',
    _type: 'article',
    title: 'Clean control article',
    lockBody: false,
    body: [
      textBlock(
        'block-text',
        [
          span('span-1', 'This is a '),
          span('span-2', 'well-formed', ['strong']),
          span('span-3', ' article with a '),
          span('span-4', 'link', ['markdef-link']),
          span('span-5', ' and some '),
          span('span-6', 'emphasis', ['em']),
          span('span-7', '.'),
        ],
        [link('markdef-link', 'https://example.com')],
      ),
      textBlock('block-ticker', [
        span('span-ticker-1', 'Keep an eye on '),
        stockTicker('ticker-1', 'ACME'),
        span('span-ticker-2', ' today.'),
      ]),
      callout('callout-1', 'This is a callout box.'),
    ],
  },
  {
    _id: 'pte-lab.repairs.keyless-block',
    _type: 'article',
    title: 'Article with a keyless top-level block',
    lockBody: false,
    body: [
      textBlock('block-text', [span('span-1', 'This block has a `_key`.')]),
      (() => {
        const block = textBlock('block-ticker', [
          span('span-ticker-1', 'Keep an eye on '),
          stockTicker('ticker-1', 'ACME'),
          span('span-ticker-2', ' today.'),
        ])
        delete block._key
        return block
      })(),
      callout('callout-1', 'This is a callout box.'),
    ],
  },
  {
    _id: 'pte-lab.repairs.keyless-child',
    _type: 'article',
    title: 'Article with a keyless span child',
    lockBody: false,
    body: [
      textBlock('block-text', [
        span('span-1', 'This span has a `_key`, but '),
        (() => {
          const child = span('span-2', 'this one does not')
          delete child._key
          return child
        })(),
        span('span-3', '.'),
      ]),
    ],
  },
  {
    _id: 'pte-lab.repairs.duplicate-keys',
    _type: 'article',
    title: 'Article with duplicate `_key`s',
    lockBody: false,
    body: [
      textBlock('dup-block', [span('span-a', 'First block sharing a `_key`.')]),
      textBlock('dup-block', [
        span('span-b', 'Second block sharing a `_key`.'),
      ]),
      textBlock('dup-children-block', [
        span('dup-span', 'One span, '),
        span('dup-span', 'another span sharing a `_key`.'),
      ]),
    ],
  },
  {
    _id: 'pte-lab.repairs.empty-children',
    _type: 'article',
    title: 'Article with an empty `children` array',
    lockBody: false,
    body: [textBlock('empty-block', [])],
  },
  {
    _id: 'pte-lab.repairs.orphan-markdefs',
    _type: 'article',
    title: 'Article with an orphaned `markDefs` entry',
    lockBody: false,
    body: [
      textBlock(
        'orphan-block',
        [span('span-1', 'No span below references the `markDef` above.')],
        [link('orphan-link', 'https://example.com/orphan')],
      ),
    ],
  },
  {
    _id: 'pte-lab.repairs.locked',
    _type: 'article',
    title: 'Locked article with a keyless span child',
    lockBody: true,
    body: [
      textBlock('block-text', [
        span('span-1', 'This span has a `_key`, but '),
        (() => {
          const child = span('span-2', 'this one does not')
          delete child._key
          return child
        })(),
        span('span-3', '.'),
      ]),
    ],
  },
]

export const commentsFixtures = [
  {
    _id: 'pte-lab.comments.clean',
    _type: 'article',
    title: 'Comments control article',
    lockBody: false,
    body: [
      textBlock('block-text', [
        span('span-1', 'foo '),
        span('span-2', 'bar'),
        span('span-3', ' baz.'),
      ]),
    ],
  },
]

export const fixtureGroups = {
  repairs: repairsFixtures,
  comments: commentsFixtures,
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const token = process.env.SANITY_PTE_LAB_TOKEN

  if (!token) {
    console.error(
      'SANITY_PTE_LAB_TOKEN is not set. Run this script with `node --env-file=.env.local scripts/seed.mjs` ' +
        '(via `pnpm --filter studio seed`), with `.env.local` populated from `~/code/@portabletext/.pte-lab.env`.',
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

  for (const docs of Object.values(fixtureGroups)) {
    for (const doc of docs) {
      await client.createOrReplace(doc)
      console.log(`seeded ${doc._id}`)
    }
  }
}
