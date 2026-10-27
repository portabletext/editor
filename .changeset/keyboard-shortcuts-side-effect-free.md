---
'@portabletext/keyboard-shortcuts': patch
---

fix: let bundlers drop the predefined shortcuts you don't import

`import {createKeyboardShortcut} from '@portabletext/keyboard-shortcuts'` now bundles to 435 bytes instead of 763, and `import {bold}` to 473 instead of 748 (esbuild `--bundle --minify`, gzip -9).
