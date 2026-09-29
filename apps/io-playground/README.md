# I/O protocol playground

An interactive view of `@portabletext/io`: Editor A, the link to the server, the server, the link to Editor B, and Editor B, side by side. Save requests, rejections and feed transactions sit as cards in the links until you deliver them, so a race is played by choosing the order.

Every value opens to its Portable Text blocks, every batch and transaction to its patches. Each label has a one-sentence explanation behind its "i", and the Concepts button lists them all. After every step a narration says what happened in plain words.

The Scenarios tab runs the Gherkin scenarios one step at a time. The Free play tab drives the same world by hand and writes down the steps as Gherkin, ready to copy out as a new scenario.

```sh
pnpm --filter io-playground dev
```
