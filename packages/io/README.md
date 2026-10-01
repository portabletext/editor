# `@portabletext/io`

> A model of the editor's I/O protocol, tested with Gherkin scenarios

This package is private. It exists to prove the host contract before it lands in `@portabletext/editor`: the editor's side of the protocol and the host adapter are real, and everything around them is fake.

## What's real and what's fake

| Part                                                                                                                                                                                                                                                                                                                                                                       | Where                          | Real or fake                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The editor's protocol logic: base, one batch in flight, pending changes, held transactions, confirmation by echo, rejection, resync, load and status, key rules, undo                                                                                                                                                                                                      | `src/protocol/io.ts`           | Real. Plain TypeScript, no React, no XState, no dependency on `@portabletext/editor`. It speaks to an editor only through `EditorForIo`, so it can move into the editor                                                                                                                                                       |
| The host adapter: saves each batch under the transaction ID it proposes (or, shaped like Studio, folds batches into one request and reports `mutation sent`), reports a permanent failure as `mutation rejected` and retries a transient one, forwards the feed, fetches the server copy for `load` and `resync`, and finds out whether a batch landed by re-submitting it | `src/protocol/host.ts`         | Real. The same job the SDK plugin and a simple app will do                                                                                                                                                                                                                                                                    |
| Patches                                                                                                                                                                                                                                                                                                                                                                    | `@portabletext/patches`        | Real. The same shapes and the same `applyAll` the editor uses                                                                                                                                                                                                                                                                 |
| Content Lake semantics for applying a batch                                                                                                                                                                                                                                                                                                                                | `src/protocol/content-lake.ts` | Real rules, shared by the editor's base and the fake server: a patch whose target is gone is a no-op, a `set` through a primitive replaces it, a `diffMatchPatch` on anything but a string fails                                                                                                                              |
| State notation                                                                                                                                                                                                                                                                                                                                                             | `@portabletext/test`           | Real. Fixtures and assertions are textspec                                                                                                                                                                                                                                                                                    |
| The editor and the user's actions                                                                                                                                                                                                                                                                                                                                          | `src/fakes/document.ts`        | Fake. Blocks, spans and a caret behind `EditorForIo`. Setting a style is a `set`, typing a `diffMatchPatch`, inserting and deleting blocks `insert` and `unset`, the placeholder becoming content `setIfMissing` plus `insert`, emptying the field `unset([])`. It applies `apply` patch by patch and moves the caret by each |
| The server                                                                                                                                                                                                                                                                                                                                                                 | `src/fakes/server.ts`          | Fake. One document with a revision counter. Records a transaction for every batch it receives, changed or not, as Content Lake does, and fails the next request with the status a step injects                                                                                                                                |
| The network                                                                                                                                                                                                                                                                                                                                                                | `src/fakes/network.ts`         | Fake. Queues that only the test steps drain, and a virtual clock                                                                                                                                                                                                                                                              |

## The editor seam

`createIo` takes an editor as the structural type `EditorForIo`, two functions and nothing else:

```ts
type EditorForIo = {
  on: <TType extends EditorEventForIo['type']>(
    type: TType,
    listener: (event: EditorEventForIo & {type: TType}) => void,
  ) => {unsubscribe: () => void}
  send: (message: EditorMessageForIo) => void
}
```

io listens to `change` (a local one carries the action's patches, which io books as pending), `ready` (the end of the first commit) and `closing` (the moment to send the final batch). It sends `load` and `resync` as whole values and `apply` for each transaction it applies.

### `apply`

`apply` carries keyed instructions for the editor's tree in `patches`, and the transaction's patches as they moved the base in `underneath`. io authors the instructions from its working copy (the base, then the batch in flight, then pending changes) before and after the transaction:

1. The editor's own patches in its echo apply nothing: they are on screen already.
2. Another writer's patch on a place that no unlanded work (the batch in flight or pending changes) touched is forwarded as it is, so the editor can move the caret by it.
3. A patch on a block unlanded work also touched becomes a `set` of the whole block from the new working copy. The server applied the editor's work after the patch, and the screen applied it before.
4. An insert into or removal from a list (the block list or a block's `children`) that unlanded work also inserted into or removed from becomes the list lined up against the new working copy key by key: keyed `unset`s, keyed `insert`s next to a sibling the list has by then, and a `set` of an item that stays but differs. Two inserts after the same block land in different orders on the two sides.

A pending insert io gave a new key, because the base now has its key, comes first as a keyed `set` of `_key`. A transaction that moved the base and left the working copy as it was comes with empty `patches`, for the editor's history. The instructions are for the editor's tree only and never reach the server.

After every `apply` and every local change, the editor's tree equals io's working copy, the placeholder aside.

The model's undo ledger stands in for the editor's history until that design is done, and it is not part of `EditorForIo`. io reads each undo step from the local change and the working copy, and computes the revert against its working copy. `createIo` takes an `applyLocalEdit(patches)` callback for it, a test seam the world wires to the fake document's user-action path (the same path typing takes). The document applies the revert as the user's own edit and reports it as a local `change`, or refuses it while read-only.

## Layout

```
src/
  index.ts              the real halves: createIo, the host, and the types they speak
  testing.ts            the fakes, the world, the step library and the runner
  protocol/
    io.ts               the protocol's editor side, speaking EditorForIo
    host.ts             the model host (plain, folding, self-confirming), as a reference host
    types.ts            the host messages and events, and EditorForIo
    content-lake.ts     applyAll with Content Lake semantics, and hasTarget
  fakes/
    document.ts         the fake editor, implementing EditorForIo
    server.ts
    network.ts
  scenario/
    world.ts, steps.ts, parameter-types.ts, compile.ts, check.ts
  test/
    scenarios.test.ts   the feature files, run with racejar
```

`@portabletext/io` exports `index.ts` and `@portabletext/io/testing` exports `testing.ts`.

## The scenarios

`gherkin-spec/*.feature` holds the scenarios: two editors, one server, and what each editor shows and sends. Every state is textspec (`B: foo|`, `H1: foo`, `B: foo;;B: bar`, `B _key="k9": baz`). A check compares keys only when the expected notation names them, and the caret only when the expected notation has one.

The step vocabulary lives in `src/scenario/steps.ts`, and `src/scenario/world.ts` wires two editors, two hosts, one server and the network together. Each editor is a fake document with io attached. Happenings are `When` steps (a user types, the server receives a batch, the feed delivers a transaction, the host resyncs). The user's actions drive the fake document directly, and undo goes to io, which holds the ledger. Checks are `Then` steps, and every check observes the editor from the outside: what it shows, what it has sent, what io told it, what listeners heard, what the server has. Every step also ends by checking that each editor's tree equals io's working copy, at the end of the step and right after every message and local change during it.

The fake document satisfies `EditorForIo`, and the real editor is meant to satisfy it once it exposes `apply` and `closing`. Then the same feature files run against either by swapping what the world constructs for each editor: the fake document today, the real editor with io attached later.

## Running

```sh
pnpm --filter @portabletext/io test:unit
```

`compileScenarios` (`src/scenario/compile.ts`) compiles a feature file into steps that run one at a time against a world, outside any test framework, and `world.snapshot()` returns the whole world as plain data.

## Not modeled

Batching by time (a change is sent as soon as nothing is in flight), operations in `change` events (the model carries patches as a stand-in, and a text operation is a `diffMatchPatch` built at the offset the user acted at, so it keeps the position the saved patch loses), redo, selection beyond a caret in one block, `transaction.value` (the field's server value a host may send with each transaction, so the editor takes the base from the server instead of mirroring it), repair keys derived from the revision and the path (io mints them from its key generator), and the floor for malformed content with its `invalid content` error (the reason is in `ErrorEvent`, and nothing emits it).
