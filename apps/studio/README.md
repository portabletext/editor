# studio

A Sanity Studio used to verify repair-on-load behavior for malformed
Portable Text documents against the workspace `@portabletext/editor`
package (`packages/editor` in this repo). The `article` document type's
`body` field is deliberately seeded with structurally broken content
(missing `_key`s, duplicate `_key`s, empty `children`, orphaned
`markDefs`) so opening it in the editor exercises the repair-on-load path.

## Setup

The project token lives at `~/code/@portabletext/.pte-lab.env`
(`SANITY_PTE_LAB_TOKEN=...`, never print its value). From the repo root:

```
cp ../.pte-lab.env apps/studio/.env.local
```

## Usage

```
pnpm --filter studio dev     # sanity dev, http://localhost:3333
pnpm --filter studio seed    # publish the pte-lab.* fixture articles
pnpm --filter studio reset   # delete every pte-lab.* document (published and draft)
```

`seed` and `reset` both read `SANITY_PTE_LAB_TOKEN` from `.env.local` via
`node --env-file`, and fail loudly if it's missing.

## Manual checklist

(TODO: filled in by a follow-up commit)
