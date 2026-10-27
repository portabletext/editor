---
'@portabletext/plugin-emoji-picker': patch
---

fix: let bundlers drop the emoji picker machine when `useEmojiPicker` is unused

Importing only `createMatchEmojis` no longer bundles the picker's state machine and `xstate`: `import {createMatchEmojis} from '@portabletext/plugin-emoji-picker'` bundles to 474 bytes instead of 17,999 (esbuild `--bundle --minify`, gzip -9).
