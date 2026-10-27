---
'@portabletext/toolbar': patch
---

fix: let bundlers drop the toolbar hooks' state machines you don't import

Each toolbar hook's state machine is now marked free of side effects, so a bundle only contains the machines for the hooks it uses. `import {useToolbarSchema} from '@portabletext/toolbar'` bundles to 915 bytes instead of 15,892, `useDecoratorButton` to 15,753 instead of 17,273, and `useToolbarSchema`, `useDecoratorButton`, `useHistoryButtons`, `useStyleSelector` and `useListButton` together to 17,027 instead of 18,204 (esbuild `--bundle --minify`, gzip -9).
