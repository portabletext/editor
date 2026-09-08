---
'@portabletext/editor': patch
---

fix: match the inserted list block by identity when inheriting list properties

Inserting keyless blocks into a list via an `insert.blocks` event now inherits the surrounding list's `level` and `listItem` as intended. Previously the inserted list block kept whatever `level` and `listItem` it arrived with, and with more than one keyless block in the event the insertion could abort entirely after hitting the event-chain depth limit.
