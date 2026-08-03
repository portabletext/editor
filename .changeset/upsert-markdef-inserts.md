---
'@portabletext/plugin-sdk-value': patch
---

fix: stop concurrent annotation edits from duplicating mark definitions

When two people annotated at the same time, the same mark definition could be saved into the document twice. When the sync layer re-sends a definition it now replaces its earlier copy instead of adding a second one.
