# `@portabletext/io`

> A model of the editor's I/O protocol, tested with Gherkin scenarios

This package is private. It exists to prove the host contract before it lands in `@portabletext/editor`: the editor's side of the protocol and the host adapter are real, and everything around them is fake.

## What's real and what's fake

| Part                                                                                                                                                                   | Where                   | Real or fake                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The editor's protocol logic: base, one batch in flight, pending changes, held transactions, confirmation by echo, rejection, resync, load and status, key rules, undo  | `src/editor.ts`         | Real. Plain TypeScript, no React, no XState, no dependency on `@portabletext/editor`, so it can move into the editor                                                                                                                      |
| The host adapter: maps a batch to its transaction, reports `mutation sent` and `mutation rejected`, forwards the feed, fetches the server copy for `load` and `resync` | `src/host.ts`           | Real. The same job the SDK plugin and a simple app will do                                                                                                                                                                                |
| Patches                                                                                                                                                                | `@portabletext/patches` | Real. The same shapes and the same `applyAll` the editor uses                                                                                                                                                                             |
| Content Lake semantics for applying a batch                                                                                                                            | `src/content-lake.ts`   | Real rules, shared by the editor's base and the fake server: a patch whose target is gone is a no-op, a path through a primitive fails                                                                                                    |
| State notation                                                                                                                                                         | `@portabletext/test`    | Real. Fixtures and assertions are textspec                                                                                                                                                                                                |
| The document and the user's actions                                                                                                                                    | `src/document.ts`       | Fake. Blocks, spans and a caret. Setting a style is a `set`, typing a `diffMatchPatch`, inserting and deleting blocks `insert` and `unset`, the placeholder becoming content `setIfMissing` plus `insert`, emptying the field `unset([])` |
| The server                                                                                                                                                             | `src/fakes/server.ts`   | Fake. One document with a revision counter. Records a transaction for every batch it receives, changed or not, as Content Lake does                                                                                                       |
| The network                                                                                                                                                            | `src/fakes/network.ts`  | Fake. Queues that only the test steps drain, and a virtual clock                                                                                                                                                                          |

## The scenarios

`gherkin-spec/*.feature` holds the scenarios: two editors, one server, and what each editor shows and sends. Every state is textspec (`B: foo|`, `H1: foo`, `B: foo;;B: bar`, `B _key="k9": baz`). A check compares keys only when the expected notation names them, and the caret only when the expected notation has one.

The step vocabulary lives in `src/scenario/steps.ts`, and `src/scenario/world.ts` wires two editors, two hosts, one server and the network together. Happenings are `When` steps (a user types, the server receives a batch, the feed delivers a transaction, the host resyncs). Checks are `Then` steps, and every check observes the editor from the outside: what it shows, what it has sent, what listeners heard, what the server has.

The same feature files are meant to run later against the real editor, with a fake host and server and a different set of step definitions.

## Running

```sh
pnpm --filter @portabletext/io test:unit
```

`compileScenarios` (`src/scenario/compile.ts`) compiles a feature file into steps that run one at a time against a world, outside any test framework, and `world.snapshot()` returns the whole world as plain data.

## Not modeled

Batching by time (a change is sent as soon as nothing is in flight), the key-matched reconciler (the screen is recomputed wholesale), operations in `change` events (the model carries patches as a stand-in), redo, several load claims, and selection beyond a caret in one block.
