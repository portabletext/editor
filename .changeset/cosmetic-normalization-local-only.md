---
'@portabletext/editor': patch
---

fix: run cosmetic span normalization only as fallout of local edits

Loading a document (`initialValue`) or receiving an `update value` no longer merges adjacent same-mark spans or removes empty sibling spans: adopted span structure is kept as the document has it, on every path, and canonicalizes when a local edit next touches its block.

Consumers with fragmented documents (for example CMS-migrated content with split spans) will no longer see a wave of span-merge mutations ride out with the first keystroke after opening. Structural repairs (missing keys, missing required fields, empty blocks) and `markDefs` housekeeping are unaffected.
