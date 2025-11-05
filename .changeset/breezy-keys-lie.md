---
'@portabletext/editor': major
---

feat: remove deprecated `maxBlocks` config

The `maxBlocks` config hasn't worked in a while. To restrict the maximum number of blocks in the editor, it's better to use the Behavior API. An official `OneLinePlugin` exists to restrict the editor to a single block.
