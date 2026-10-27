---
'@portabletext/plugin-input-rule': patch
---

fix: let bundlers drop the input rule machine when `InputRulePlugin` is unused

Importing only `defineInputRule` or `defineTextTransformRule` no longer bundles `InputRulePlugin`'s state machine and `xstate`. `import {defineInputRule} from '@portabletext/plugin-input-rule'` bundles to 322 bytes instead of 14,838, and `defineTextTransformRule` to 979 instead of 15,307 (esbuild `--bundle --minify`, gzip -9). Packages that only export rules, such as `@portabletext/plugin-typography`'s individual rules, shrink the same way.
