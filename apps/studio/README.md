# studio

A Sanity Studio used as an integration test bed for the workspace
`@portabletext/editor` package (`packages/editor` in this repo): a real
Studio, a real workspace, the editor wired in as it would be for any
consumer. Tests drive a real browser against a running Studio and listen
on the Sanity mutation stream (`client.listen`, subscribed before
navigating) to observe what the editor actually persists, rather than
asserting on in-memory editor state. All families share one Sanity
project/dataset (`e2sapjbh`/`scratch`), so the CI workflow serializes every
run through a single concurrency group; see "CI" below.

Tests are organized into **families**, each a self-contained scenario
area with its own namespaced fixtures. "Repairs" (below) is the first
family.

## Setup

The project token is a `SANITY_PTE_LAB_TOKEN=...` entry in an env file
kept outside the repo (never print its value). Copy it into
`apps/studio/.env.local`.

## Usage

```
pnpm --filter studio dev --port 3391   # sanity dev, matching the CORS origin below
pnpm --filter studio seed              # publish every family's fixture articles
pnpm --filter studio reset             # delete every family's fixture documents (published and draft)
pnpm --filter studio e2e               # run the full Playwright suite
```

CORS on project `e2sapjbh` is configured for `http://localhost:3391`, and
the e2e suite's `webServer` starts `sanity dev` on that port. Plain `pnpm
dev` (no `--port`) falls back to Sanity's own default of 3333, which won't
match CORS and collides with any other local Studio squatting that port;
always pass `--port 3391` for manual browsing against this project.

`seed` and `reset` both read `SANITY_PTE_LAB_TOKEN` from `.env.local` via
`node --env-file`, and fail loudly if it's missing.

## Support layer

`e2e/support/` holds the plumbing shared across families, so a family's
specs read as scenario and assertions only:

- `client.ts`: `createLabClient()`, the shared `e2sapjbh`/`scratch` client.
- `wiretap.ts`: `wiretap(client, documentIds, windowMs)`, the
  `client.listen` recorder. Subscribes before the caller navigates and
  resolves with every recorded mutation once the window elapses.
- `seed.ts`: `resetDoc(client, fixtures, id)`, client-based (re)seeding of
  one document against a family's fixture array.
- `render-state.ts`: `openDocument(page, id)` and `waitForRenderState(page)`,
  which tells the PTE engine mounting apart from Studio's own "Missing
  keys" / "Non-unique keys" array-input guard screens winning the race
  first.
- `transactions.ts`: classifiers over recorded mutations, e.g.
  `hasEditorRepairPatch` (an editor-emitted repair addresses the node by
  key: a `set`/`diffMatchPatch` on a `body[_key=="..."]...._key` path) and
  `summarizeMutation`/`findRepeatedPaths` (a server enrichment transaction
  bundles a `create`, `_system.*` bookkeeping, and index-addressed `_key`
  sets).

## Test families

### Repairs

Fixtures: `pte-lab.repairs.*` (`scripts/seed.mjs`, `repairsFixtures`).
Specs: `e2e/repairs/repair-on-load.spec.ts` and
`e2e/repairs/repair-matrix.spec.ts`.

The `article` document type's `body` field is deliberately seeded with
structurally broken content (missing `_key`s, duplicate `_key`s, empty
`children`, orphaned `markDefs`) so opening it in the editor exercises the
repair-on-load path.

```
pnpm --filter studio seed   # the specs expect the fixture articles to exist
pnpm --filter studio e2e
```

Playwright starts `pnpm dev --port 3391` for you if nothing is already
listening on port 3391 (`reuseExistingServer`), and authenticates the
browser context by seeding `localStorage` with `SANITY_PTE_LAB_TOKEN`
under the Studio's own auth-token key, so no interactive login happens.

- **`repair-on-load.spec.ts`**, run serially against
  `pte-lab.repairs.keyless-child` and `pte-lab.repairs.clean`:
  - **structural repair persists exactly once on load**: resets the
    keyless-child article, opens it, and asserts the editor renders
    without an "Invalid value" dialog. It listens for mutations on
    `drafts.pte-lab.repairs.keyless-child`, groups them into
    transactions, and asserts exactly one transaction contains an
    editor-emitted repair (with no further one following it), then
    re-fetches the draft and asserts every child now has a string `_key`
    with the seeded text unchanged. See "Known shape" below for why more
    than one mutation transaction on load is expected.
  - **clean document stays silent**: resets the well-formed control
    article, opens it, and asserts zero mutations arrive and no draft
    gets created.
- **`repair-matrix.spec.ts`** is measurement, not enforcement: for every
  structural defect class, it records the render state reached, the
  observed transaction count and timing, and which paths got touched more
  than once, writing the result to `REPAIR_MATRIX_RESULTS_PATH` (default
  `test-artifacts/repair-matrix-results.json`) as a before/after baseline
  rather than pinning a specific mutation count as "correct".

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

Opening a structurally broken document like `pte-lab.repairs.keyless-child`
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
it lands second. `repair-on-load.spec.ts` asserts on this shape directly:
exactly one transaction contains an editor-emitted repair, and no further
one follows it. Document this here so the two-transaction shape doesn't
get re-diagnosed as a bug.

## Adding a new family

1. **Namespace**: pick fixture IDs under `pte-lab.<family>.*`. IDs never
   collide across families as long as each stays inside its own segment.
2. **Seeds**: add a `<family>Fixtures` array to `scripts/seed.mjs` and
   register it in the `fixtureGroups` map there; `seed` publishes every
   group, and `reset` deletes by family prefix automatically once a
   family is registered.
3. **Support imports**: build specs on `e2e/support/` (`createLabClient`,
   `wiretap`, `resetDoc`, `openDocument`/`waitForRenderState`,
   the transaction classifiers) instead of reimplementing recorder or
   reset logic per family.
4. **Specs**: add `e2e/<family>/*.spec.ts`, importing the family's
   fixtures and the support layer. `playwright.config.ts`'s `testDir`
   (`./e2e`) already discovers specs recursively, so no config change is
   needed.
5. **The shared dataset is serialized, not partitioned**: every family
   runs through the one `scratch` dataset and the one `concurrency.group:
studio-e2e` CI lane (see "CI" below), so a new family's specs queue
   behind whatever else is running rather than racing it; extending the
   `article` schema for a new family's fixtures is fine, since it's
   already general enough to extend, but a new family cannot assume it
   runs concurrently with, or in isolation from, any other family.

## CI

`.github/workflows/studio-e2e.yml` (rendering in PR checks as "Browser
tests (sanity studio)", alongside the "Browser tests (chromium/firefox/
webkit)" family from `test-browser.yml`) runs the full suite across every
family against the real `e2sapjbh`/`scratch` project. It only runs on a
pull request carrying the `trigger: studio-e2e` label (or via manual
`workflow_dispatch`), so a fork PR never sees `SANITY_PTE_LAB_TOKEN`
unless a maintainer applies the label. Because fixtures write fixed
document IDs into the one shared `scratch` dataset, the workflow
serializes across every PR and every family through a fixed
`concurrency.group: studio-e2e` (not per-ref), rather than letting
concurrent runs race the same documents.

On failure, the job uploads the Playwright HTML report
(`apps/studio/playwright-report`) and `apps/studio/test-artifacts/`
(where `repair-matrix.spec.ts` writes its measurement dump) as a single
`studio-e2e-report` artifact, kept for 7 days.
