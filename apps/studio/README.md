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

## End-to-end tests

`e2e/repair-on-load.spec.ts` drives a real browser against a running
Studio and the seeded `pte-lab.*` dataset, listening on the Sanity
mutation stream to observe what the editor actually persists when a
malformed document loads:

```
pnpm --filter studio seed   # the spec expects the fixture articles to exist
pnpm --filter studio e2e
```

Playwright starts `pnpm dev` for you if nothing is already listening on
port 3333 (`reuseExistingServer`), and authenticates the browser context
by seeding `localStorage` with `SANITY_PTE_LAB_TOKEN` under the
Studio's own auth-token key, so no interactive login happens.

The suite has two tests, run serially against `pte-lab.keyless-child` and
`pte-lab.clean`:

- **structural repair persists exactly once on load**: resets the
  keyless-child article, opens it, and asserts the editor renders without
  an "Invalid value" dialog. It listens for mutations on
  `drafts.pte-lab.keyless-child` and asserts exactly one burst of
  activity (no further mutations in the 10 seconds after the first),
  then re-fetches the draft and asserts every child now has a string
  `_key` with the seeded text unchanged.
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
CHOKIDAR_USEPOLLING=1 pnpm --filter studio dev
```

`playwright.config.ts` already sets `CHOKIDAR_USEPOLLING=1` on the
`webServer` it manages, so `pnpm --filter studio e2e` only needs the
raised `ulimit`.

### Known issue: repair-on-load fires more than once

As of this writing, **"structural repair persists exactly once on
load" fails**: opening `pte-lab.keyless-child` produces two or three
separate mutation transactions a second or so apart, each replacing the
previously-repaired child's `_key` with a newly generated one (visible
as a `diffMatchPatch` on `body[...].children[N]._key` in the mutation
stream), rather than the single expected repair. The final document is
still well-formed (every child ends up with a string `_key`, text
unchanged), so this is a redundant-rewrite/idempotency issue in the
repair path, not data corruption. Sanity Studio renders in
`React.StrictMode` by default in development, which double-invokes
effects; that's a plausible trigger, but the observed run producing
three separate transactions is more churn than a single double-invoke
would explain. "clean document stays silent" passes.
