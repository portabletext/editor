---
'@portabletext/editor': patch
---

fix: publish one JavaScript file per source module

Importing a single helper from `@portabletext/editor` no longer pulls in the whole editor. The package now ships one JavaScript file per source module instead of one bundled file per entry, so bundlers drop the modules your imports don't reach, including bundlers built on esbuild, which could not shake the old files. A bare `import {defineSchema} from '@portabletext/editor'` bundles to 70 bytes instead of 119,920, and a bare `import {useEditor} from '@portabletext/editor'` to 256 bytes instead of 120,055 (esbuild `--bundle --minify`, gzip -9). An app that renders the editor still needs all of it and stays about the same size (137,554 bytes before, 138,902 now). The package's exports and types are unchanged, its declarations stay bundled per entry, and the files inside `lib` are not importable on their own.
