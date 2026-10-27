---
'@portabletext/markdown': patch
---

fix: publish one file per source module

`@portabletext/markdown` now ships one file per source module instead of a single bundled `dist/index.js`, so bundlers drop the modules your imports don't reach. Code that only serializes no longer ships `markdown-it`: a bare `import {portableTextToMarkdown} from '@portabletext/markdown'` bundles to 12,501 bytes instead of 50,235 (esbuild `--bundle --minify`, gzip -9). Code that imports `markdownToPortableText` still needs `markdown-it` and stays about the same size (50,951 bytes before, 51,283 now). The package's exports and types are unchanged, and the files inside `dist` are not importable on their own.
