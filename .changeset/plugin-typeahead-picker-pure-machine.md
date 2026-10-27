---
'@portabletext/plugin-typeahead-picker': patch
---

fix: let bundlers drop the typeahead picker machine when `useTypeaheadPicker` is unused

Importing only `defineTypeaheadPicker` no longer bundles the picker's state machine and `xstate`: `import {defineTypeaheadPicker} from '@portabletext/plugin-typeahead-picker'` bundles to 305 bytes instead of 19,434 (esbuild `--bundle --minify`, gzip -9).
