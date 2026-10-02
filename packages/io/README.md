# `@portabletext/io`

> A model of the editor's I/O protocol, tested with Gherkin scenarios

This package is private. It exists to prove the host contract before it lands in `@portabletext/editor`: the editor's side of the protocol and the host adapter are real, and everything around them is fake.

## What's real and what's fake

| Part                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Where                          | Real or fake                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The editor's protocol logic: base, one mutation in flight, pending changes, held transactions, confirmation by echo, rejection, resync, load and status, key rules                                                                                                                                                                                                                                                                                                      | `src/protocol/io.ts`           | Real. Plain TypeScript, no React, no XState, no dependency on `@portabletext/editor`. It speaks to an editor only through `EditorForIo`, so it can move into the editor                                                                                                                                                       |
| The host adapter: saves each mutation under the transaction ID it proposes, so a transaction usually carries one mutation (or, shaped like Studio, folds mutations into one request and reports `mutation sent`, so its transaction can carry several), reports a permanent failure as `mutation rejected` and retries a transient one, forwards the feed, fetches the server copy for `load` and `resync`, and finds out whether a mutation landed by re-submitting it | `src/protocol/host.ts`         | Real. The same job the SDK plugin and a simple app will do                                                                                                                                                                                                                                                                    |
| Patches                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `@portabletext/patches`        | Real. The same shapes and the same `applyAll` the editor uses                                                                                                                                                                                                                                                                 |
| Content Lake semantics for applying a mutation                                                                                                                                                                                                                                                                                                                                                                                                                          | `src/protocol/content-lake.ts` | Real rules, shared by the editor's base and the fake server: a patch whose target is gone is a no-op, a `set` through a primitive replaces it, a `set` replaces an object or a list with anything, a `diffMatchPatch` on anything but a string fails                                                                          |
| State notation                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `@portabletext/test`           | Real. Fixtures and assertions are textspec                                                                                                                                                                                                                                                                                    |
| The editor and the user's actions                                                                                                                                                                                                                                                                                                                                                                                                                                       | `src/fakes/document.ts`        | Fake. Blocks, spans and a caret behind `EditorForIo`. Setting a style is a `set`, typing a `diffMatchPatch`, inserting and deleting blocks `insert` and `unset`, the placeholder becoming content `setIfMissing` plus `insert`, emptying the field `unset([])`. It applies `apply` patch by patch and moves the caret by each |
| The server                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `src/fakes/server.ts`          | Fake. One document with a revision counter. Records a transaction for every mutation it receives, changed or not, as Content Lake does, stores whatever the patches leave behind, malformed blocks included, and fails the next request with the status a step injects                                                        |
| The network                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `src/fakes/network.ts`         | Fake. Queues that only the test steps drain, and a virtual clock. Per world, it carries each transaction with the field as the server held it right after                                                                                                                                                                     |

## API

`createIo` returns io as a store, shaped like the editor: `getSnapshot`, `subscribe`, `on` and `send`, and nothing else.

```ts
type Io = {
  getSnapshot: () => IoSnapshot
  subscribe: (
    observer:
      | {
          next?: (snapshot: IoSnapshot) => void
          error?: (error: unknown) => void
          complete?: () => void
        }
      | ((snapshot: IoSnapshot) => void),
  ) => {unsubscribe: () => void}
  on: <TType extends IoEvent['type'] | '*'>(
    type: TType,
    listener: (
      event: IoEvent & (TType extends '*' ? unknown : {type: TType}),
    ) => void,
  ) => {unsubscribe: () => void}
  send: (message: IoMessage) => void
}

type IoSnapshot = {
  context: {
    status: 'loading' | 'ready' | 'unmounted'
    sync: 'synced' | 'saving' | 'blocked' | 'out of step'
    rev: string | undefined
    inFlight: {id: string; transactionId: string} | undefined
    pending: number
  }
}
```

`getSnapshot` returns the same object until something in the snapshot changes, and `subscribe` calls `next` once after every change, so `useSyncExternalStore` and `useSelector` from `@xstate/react` work against io as they work against the editor. `status` is `'loading'` until the editor's `ready` and `'unmounted'` after its `closing` or the host's `close`. `sync` is `'saving'` while a mutation is in flight or changes are pending, `'blocked'` after a rejection and `'out of step'` after an error or a lost feed, both until the next resync. `rev` is the base's revision, `inFlight` the mutation in flight and the transaction ID it is saved under, and `pending` how many local changes wait to be sent.

`on` listens to what io tells the host: `mutation` (a mutation to save), `error` (io is out of step until a resync), `work dropped` (the user's unsaved work io gave up on) and `warning` (a message for the host's log), or all of them with `'*'`. `send` takes what the host tells io: `load`, `transaction`, `mutation sent`, `mutation rejected`, `feed lost`, `resync` and `close`. `close` does what the editor's `closing` does: io sends the final mutation, or drops the pending changes while sending is blocked or io is out of step, and stops.

### Dropped work

`work dropped` carries the user's own patches io gave up on, each reported once, with a reason. `no target` covers pending changes whose target a transaction or a resync took away (they stay pending and go out as no-ops), and the editor's own patches that come back in its echo with no target in the base right before they applied: another writer's transaction landed first and took their target away, so the server applied them as no-ops and the words in them are gone. `closed while blocked` and `closed out of step` carry the pending changes a close drops, and `rejected` the rejected mutation a resync drops.

### Transaction IDs

Every mutation proposes the transaction ID it is saved under, from `createIo`'s `transactionIdGenerator`. The default is a random UUID (`crypto.randomUUID()` where the runtime has it, a version 4 UUID from `Math.random` otherwise), since the ID must be unique among every writer of the document. A host that saves a mutation as its own request uses the ID as it is, and a host that chooses its own names it with `mutation sent`. The world injects a deterministic generator per editor (`A-tk0`, `A-tk1` for Editor A), so the scenarios and tests can name transactions.

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

io listens to `change` (a local one carries the action's patches, which io books as pending), `ready` (the end of the first commit) and `closing` (the moment to send the final mutation). It sends `load` and `resync` as whole values and `apply` for each transaction it applies.

### `apply`

`apply` carries keyed instructions for the editor's tree in `patches`, and the transaction's patches as they moved the base in `underneath`. io authors the instructions from its working copy (the base, then the mutation in flight, then pending changes) before and after the transaction, deciding per list (the block list or a block's `children`):

1. The editor's own patches in its echo apply nothing: they are on screen already.
2. A list is lined up when the transaction inserts into it, removes from it or changes a key in it, and unlanded work (the mutation in flight or pending changes) also touched it, by inserting, removing or changing anything in its items. It is also lined up whenever the transaction changes a key in it. Every patch of the transaction on that list is replaced by one line-up against the new working copy, key by key: keyed `unset`s, keyed `insert`s next to a sibling the list has by then, and a `set` of an item that stays but differs. None of them is forwarded on its own, since a later patch can depend on an earlier one: an insert after a new key, or a block removed and inserted again elsewhere. Two inserts after the same block land in different orders on the two sides.
3. On a list that isn't lined up, another writer's patch on a place no unlanded work touched is forwarded as it is, so the editor can move the caret by it. A patch addressed by an index in the stored array is first addressed to that block in the editor, by its key (by its position in the editor when it has none), since the editor leaves out the stored blocks that aren't objects.
4. On a list that isn't lined up, a patch on a block unlanded work also touched becomes a `set` of the whole block from the new working copy. The server applied the editor's work after the patch, and the screen applied it before.

A transaction that moved the base and left the working copy as it was comes with empty `patches`, for the editor's history. The instructions are for the editor's tree only and never reach the server.

After every `apply` and every local change, the editor's tree equals io's working copy, the placeholder aside, with the stored blocks that aren't objects left out of the working copy.

### Undo

Undo is not part of io. The model's undo is a stand-in for the editor's history until that design is done, and it lives in `testing`: `withModelUndo(io, applyLocalEdit)` (`src/scenario/model-undo.ts`) wraps io with an undo ledger, `undo()` and `getUndoDepth()`. The ledger hears io's local changes, mutations, transactions and resyncs through io's internals, reads each undo step from the local change and the working copy, and computes the revert against the working copy at undo time. io reads nothing from it. The world wires `applyLocalEdit` to the fake document's user-action path (the same path typing takes): the document applies the revert as the user's own edit and reports it as a local `change`, or refuses it while read-only.

### `transaction.value`

A transaction may carry `value`, the field as the server holds it after the transaction, from the listener's result. io then takes it as the new base instead of applying the transaction's patches to the old one. The patches still travel: io checks them for duplicate keys and failures, authors `apply` from them, and matches them against its mutation for the echo check. io authors the instructions against the working copy the patches alone make, so they are the same with `value` or without, and lines up whatever `value` changed beyond the patches after them, key by key.

`createWorld({serverCopyOnTransactions: true})`, or the step `Given transactions that carry the server's copy`, has the network deliver every transaction with the server's copy after it, and the host pass it on. The test runner runs every feature in both modes, a `describe` per mode.

### Out of step

After an `error`, whatever its reason, or `feed lost`, the editor is out of step until a resync. io keeps booking local changes as pending and keeps recognizing its own mutations when they come back, but sends no mutation: pending work written against a copy io no longer trusts could repeat a key the server has by now. The resync re-applies the pending changes to the fresh copy, re-keys what collides, and sends them. Closing while out of step sends nothing and emits `work dropped` with reason `closed out of step`, carrying the pending patches.

### Keys

A key io mints while repairing a received whole value (a missing or duplicate `_key` in `load` or `resync`) comes from the value's revision and the repaired node's index path: the 32-bit FNV-1a hash of the revision and the path segments joined by `/` (`r1/0`, `r1/0/children/1`), as eight hex digits. When the value already has that key, io hashes again with `#1`, `#2` and so on appended. Two editors repairing the same revision received the same value, so they hash the same inputs and the taken-key suffix resolves the same way: they mint the same keys, and their repairs agree. Keys for local inserts come from the editor's key generator, and the world gives each editor's generator its own prefix (`a-`, `b-`), so the two never mint the same key by accident.

Keys collide among siblings only: the block list, or one block's `children`. Applied work is never re-keyed in place. A transaction that gives a list of the new base (taken from its `value` when it carries one) a key that a pending insert into the same list also inserts emits `error` with reason `duplicate key`, as one that collides with an insert into the same list in the mutation in flight or the rejected mutation does, and the editor is out of step. A span keyed like a block is no collision. The resync gives the pending insert a new key from the key generator while it re-applies the pending changes, so the caret, which stays with its key, may land in the other writer's block.

### The floor

The floor is the set of shapes the editor cannot hold at all, defined in `src/protocol/floor.ts`: a block that isn't an object, a block without `_key` or `_type`, a text block (`_type: 'block'`) whose `children` isn't a non-empty array of objects, a text block's child without `_key` or `_type`, and a span (`_type: 'span'`) whose `text` isn't a string.

On `load` and `resync`, io repairs the received value to the floor before anything else, and books the repairs, with the key repairs, as the editor's own pending work, so they go out in the next mutation: a missing `_key` gets a repair key, a missing `_type` becomes `'block'` (`'span'` for a text block's child), a `text` that isn't a string becomes `''`, a text block's child that isn't an object is removed by index, and a `children` that isn't an array or holds no object becomes one empty span with a repair key. A block that isn't an object is left out of what the editor gets and never written to: while the stored field holds one, io turns the whole-field `unset` of a local edit that empties the field into keyed `unset`s of the blocks the editor shows. The repairs address the stored array: io maps each of the editor's block positions to its index there, and a repair addresses its block by that index when its key is missing or repeated, and by key otherwise.

On a `transaction`, io checks the blocks the transaction changed in the base against the floor. A base below the floor emits `error` with reason `invalid content`, and the editor is out of step until a resync, which repairs it.

## Layout

```
src/
  index.ts              the real halves: createIo, the host, and the types they speak
  testing.ts            the fakes, the world, the step library and the runner
  protocol/
    io.ts               the protocol's editor side, speaking EditorForIo
    apply.ts            the keyed instructions io authors for the editor's tree
    host.ts             the model host (plain, folding, self-confirming), as a reference host
    types.ts            the host messages and events, and EditorForIo
    content-lake.ts     applyAll with Content Lake semantics, and hasTarget
    floor.ts            the floor, and the repairs that bring a received value up to it
    nodes.ts            keys, children and equality, shared by io and the model's undo
  fakes/
    document.ts         the fake editor, implementing EditorForIo
    server.ts
    network.ts
  scenario/
    world.ts, steps.ts, parameter-types.ts, compile.ts, check.ts
    model-undo.ts       the model's undo, wrapped around io
  test/
    scenarios.test.ts   the feature files, run with racejar
```

`@portabletext/io` exports `index.ts` and `@portabletext/io/testing` exports `testing.ts`.

## The scenarios

`gherkin-spec/*.feature` holds the scenarios: two editors, one server, and what each editor shows and sends. Every state is textspec (`B: foo|`, `H1: foo`, `B: foo;;B: bar`, `B _key="k9": baz`). A check compares keys only when the expected notation names them, and the caret only when the expected notation has one. Textspec can't spell content below the floor, so steps name it instead: `the server's block "k1" has no key` (or `has no type`, `has children "oops"`, `has a span whose text is 42`, `is the string "oops"`) before anyone loads, and `a script changes the server's block "k1" so it ...` as a transaction. `the server has "..."` compares the server's blocks that are objects, and `the server has a block that is not an object` checks for the rest.

The step vocabulary lives in `src/scenario/steps.ts`, and `src/scenario/world.ts` wires two editors, two hosts, one server and the network together. Each editor is a fake document with io attached. Happenings are `When` steps (a user types, the server receives a mutation, the feed delivers a transaction, the host resyncs). The user's actions drive the fake document directly, and undo goes to the model's undo wrapped around io. Checks are `Then` steps, and every check observes the editor from the outside: what it shows, what it has sent, what io told it, what listeners heard, what the server has. Every step also ends by checking that each editor's tree equals io's working copy, at the end of the step and right after every message and local change during it.

The fake document satisfies `EditorForIo`, and the real editor is meant to satisfy it once it exposes `apply` and `closing`. Then the same feature files run against either by swapping what the world constructs for each editor: the fake document today, the real editor with io attached later.

## Running

```sh
pnpm --filter @portabletext/io test:unit
```

`compileScenarios` (`src/scenario/compile.ts`) compiles a feature file into steps that run one at a time against a world, outside any test framework, and `world.snapshot()` returns the whole world as plain data.

## Not modeled

Sending on a timer (a change is sent as soon as nothing is in flight), operations in `change` events (the model carries patches as a stand-in, and a text operation is a `diffMatchPatch` built at the offset the user acted at, so it keeps the position the saved patch loses), redo, selection beyond a caret in one block, and an above-floor object block (an image) in the fake document: its textspec access throws.
