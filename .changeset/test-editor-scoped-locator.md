---
'@portabletext/editor': patch
---

fix: scope `createTestEditor`'s returned locator to the rendered editor

`createTestEditor` from `@portabletext/editor/test/vitest` discarded the scoped locator from its underlying `render()` and built a document-wide `page.getByRole('textbox')` lookup. Two calls in the same DOM would have the second one's locator address the first editor. Vitest's iframe-per-test isolation hid this; embedders that share a DOM across editors hit it.

Use the scoped locator from `render()` so each editor's locator targets exactly that editor.
