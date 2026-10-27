---
'@portabletext/plugin-table': patch
---

fix: let bundlers drop `referenceContainers` when it is unused

Importing a reference render from `@portabletext/plugin-table/ui` without `referenceContainers` no longer bundles the renders it doesn't use. `import {TableCell} from '@portabletext/plugin-table/ui'` bundles to 2,159 bytes instead of 20,117, and `TableRow` to 953 instead of 20,118 (esbuild `--bundle --minify`, gzip -9).
