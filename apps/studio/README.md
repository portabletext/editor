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
pnpm --filter studio dev --port 3391   # sanity dev, matching the CORS origin below
pnpm --filter studio seed              # publish the pte-lab.* fixture articles
pnpm --filter studio reset             # delete every pte-lab.* document (published and draft)
```

CORS on project `e2sapjbh` is configured for `http://localhost:3391`, and
the e2e suite's `webServer` starts `sanity dev` on that port. Plain `pnpm
dev` (no `--port`) falls back to Sanity's own default of 3333, which won't
match CORS and collides with any other local Studio squatting that port;
always pass `--port 3391` for manual browsing against this project.

`seed` and `reset` both read `SANITY_PTE_LAB_TOKEN` from `.env.local` via
`node --env-file`, and fail loudly if it's missing.

## End-to-end tests

`e2e/repair-on-load.spec.ts` drives a real browser against a running
Studio and the seeded `pte-lab.*` dataset, listening on the Sanity
mutation stream to observe what the editor actually persists when a
malformed document loads:

```
pnpm --filter studio seed   # the spec expects the fixture articles to exist
pnpm --filter studio e2e
```

Playwright starts `pnpm dev --port 3391` for you if nothing is already
listening on port 3391 (`reuseExistingServer`), and authenticates the
browser context by seeding `localStorage` with `SANITY_PTE_LAB_TOKEN`
under the Studio's own auth-token key, so no interactive login happens.
Port 3391 (rather than Sanity's default 3333) is deliberate: 3333 is a
common default for other local Sanity Studios too, so the rig has
repeatedly collided with unrelated dev servers already squatting it.

The suite has two tests, run serially against `pte-lab.keyless-child` and
`pte-lab.clean`:

- **structural repair persists exactly once on load**: resets the
  keyless-child article, opens it, and asserts the editor renders without
  an "Invalid value" dialog. It listens for mutations on
  `drafts.pte-lab.keyless-child`, groups them into transactions, and
  asserts exactly one transaction contains an editor-emitted repair (with
  no further one following it), then re-fetches the draft and asserts
  every child now has a string `_key` with the seeded text unchanged. See
  "Known shape" below for why more than one mutation transaction on load
  is expected.
- **clean document stays silent**: resets the well-formed control
  article, opens it, and asserts zero mutations arrive and no draft gets
  created.

### Environment note: `fs.watch` and this monorepo's `node_modules`

`sanity dev`'s Vite dev server watches the project directory with a
single native, non-recursive `fs.watch` call. On a checkout where
`node_modules` holds pnpm's usual dense symlink graph, that single watch
can exhaust the process's file descriptors on the very first change
event (`EMFILE`) well before hitting typical `ulimit -n` values. If `sanity
dev` (or the `e2e` script, which starts it) crashes with `EMFILE: too
many open files, watch`, raise the descriptor limit and fall back to
chokidar's polling watcher for this process:

```
ulimit -n 100000
CHOKIDAR_USEPOLLING=1 pnpm --filter studio dev --port 3391
```

`playwright.config.ts` already sets `CHOKIDAR_USEPOLLING=1` on the
`webServer` it manages, so `pnpm --filter studio e2e` only needs the
raised `ulimit`.

### Known shape: two mutation transactions on a broken doc's first load

Opening a structurally broken document like `pte-lab.keyless-child`
produces two mutation transactions on the draft, not one, and that's
expected:

1. The Actions API draft-create itself. Content Lake enriches array
   items with `_key`s server-side as part of creating the draft, so this
   transaction bundles the `create`, `_system.*` bookkeeping patches, and
   index-addressed `_key` sets (`body[0].children[1]._key`) into one
   transaction.
2. The editor's own intake repair, addressing the same child by its
   block's key instead of an index (a `set`/`diffMatchPatch` patch on
   `body[_key=="..."]...children...._key`), which runs once per load and
   supersedes the server's generated key with its own.

The two transactions are independent and expected: the server enriches
keys at draft-creation time as a general Content Lake behavior unrelated
to this editor, and the editor repairs the same structural gap on intake
regardless of what the server already did. The editor's key wins because
it lands second. `e2e/repair-on-load.spec.ts` asserts on this shape
directly: exactly one transaction contains an editor-emitted repair, and
no further one follows it. Document this here so the two-transaction
shape doesn't get re-diagnosed as a bug.
