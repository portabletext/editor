# `@portabletext/io`

> Keeps a Portable Text editor in sync with the server copy of its field

io sits between a Portable Text editor and a host that talks to a server, such as Sanity through `@sanity/sdk`. It holds the user's unsaved changes on top of the server's copy, sends them as one mutation at a time, recognises its own mutations when they come back, and applies other writers' changes to the editor as the smallest keyed change. The host does the network, and io decides what to send and what the editor shows.

## Installation

```bash
npm install @portabletext/io
```

## Usage

```ts
import {createIo} from '@portabletext/io'

const io = createIo({editor, keyGenerator})

io.on('mutation', (mutation) => {
  // Save `mutation.patches` as one transaction under `mutation.transactionId`
})

io.send({type: 'load', value, rev})
```

`editor` is an `EditorForIo`, the part of an editor io uses: it listens to `change`, `ready` and `closed`, and sends `load`, `resync` and `apply`. An adapter implements it on top of an editor. `keyGenerator` is the editor's key generator.

## Host to io

| Message                                                                 | When                                                                                                                                        |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `{type: 'load', value, rev}`                                            | The server's copy, before the editor is ready                                                                                               |
| `{type: 'transaction', transactionId, previousRev, resultRev, patches}` | Every transaction from the document's listener, io's own included                                                                           |
| `{type: 'mutation sent', id, transactionId}`                            | The host saved a mutation under another transaction ID than the one io proposed                                                             |
| `{type: 'mutation rejected', id}`                                       | The server refused a mutation for good                                                                                                      |
| `{type: 'feed lost'}`                                                   | The listener stopped, so transactions may have been missed                                                                                  |
| `{type: 'resync', value, rev, outcomes?}`                               | A fresh copy after io went out of step. With a mutation in flight, `outcomes` says whether it is `'applied'` in the copy or `'not applied'` |
| `{type: 'close'}`                                                       | The host is done                                                                                                                            |

Sanity uses a transaction's ID as the revision it results in, so for `@sanity/sdk` `resultRev` is the transaction ID. The host saves each mutation once, under the proposed transaction ID, with batching off.

## io to host

| Event                                                | Meaning                                                                                                                                                                                      |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'mutation'`: `{id, transactionId, patches, final?}` | Save these patches. io keeps one mutation in flight, except on close, when it hands over the unsent changes at once as `final`. The host sends that one after the mutation in flight settles |
| `'work dropped'`: `{patches, reason}`                | The user's own work io gave up on: patches whose target another writer removed (`'no target'`), or a mutation the server refused (`'rejected'`)                                              |

## Snapshot

`io.getSnapshot()` returns `{value, matches, context}`, and `io.subscribe` calls back when it changes.

- `value` is `'loading'`, `{ready: 'synced'}`, `{ready: 'saving'}`, `{ready: 'out of step'}` or `'closed'`. `matches('ready')` is true for each of the `ready` states.
- `context` is `{rev, inFlight, pending, outOfStep?}`: the server revision io's copy is at, the mutation in flight, the number of unsent changes, and why io is out of step.

Out of step means io no longer knows the server's copy: a missing transaction did not arrive in time (`'gap'`), the feed was lost (`'feed lost'`), a transaction could not be applied (`'patch failed'`), or io's own mutation came back changed (`'echo mismatch'`). io keeps the user's changes and sends nothing until the host sends `resync`.

io throws on a message it doesn't accept in its state, such as `load` after the editor is ready. After close it logs one instead, since the editor and the host may still be winding down.
