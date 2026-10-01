# I/O protocol playground

An interactive view of `@portabletext/io`: Editor A, the link to the server, the server, the link to Editor B, and Editor B, side by side. Save requests, rejections and feed transactions sit as cards in the links until you deliver them, so a race is played by choosing the order.

Each editor shows its message path: every `mutation`, `mutation sent`, `transaction`, `feed lost`, `load` and `resync` between its host and io, every `apply` io sends the editor, and the host's re-submits. Every value opens to its Portable Text blocks, every batch, transaction and message to its patches. Each label has a one-sentence explanation behind its "i", and the Concepts button lists them all. After every step a narration says what happened in plain words.

The Scenarios tab runs the Gherkin scenarios one step at a time. The Free play tab drives the same world by hand and writes down the steps as Gherkin, ready to copy out as a new scenario. It starts the editors in their first commit, and offers a plain, a Studio-shaped and a Horizon-shaped host, a feed that dies without telling anyone, a stored copy below the floor reached by a resync or by a transaction, and a listener that sends the document with each transaction. A `work dropped` shows as a notice with the dropped text.

```sh
pnpm --filter io-playground dev
```
