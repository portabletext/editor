---
"@portabletext/markdown": patch
---

Update `@portabletext/toolkit` to v6

Nothing changes in the markdown output. The headline fix in v6 is to `nestLists()`, which this package does not use, since markdown expresses list depth through indentation and reads each block's `level` directly.
