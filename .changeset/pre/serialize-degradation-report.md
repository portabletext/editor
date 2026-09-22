---
'@portabletext/markdown': minor
---

feat: report serialize-side degradation via `onDegradation` in `portableTextToMarkdown`

`portableTextToMarkdown` now takes an `onDegradation` option for the losses its own default renderers fall back to: an annotation or decorator with no mark renderer (`annotation-dropped`, `decorator-dropped`), a block style with no renderer (`style-fallback`), or a list-item kind with no renderer (`list-item-fallback`). One callback, called at most once, after the whole document has been walked, only when at least one construct degraded, with each loss reported as a `SerializeDegradation`, whose `path` addresses the node the loss occurred on, from the top-level `blocks` array down (a cell's degradation carries the full path down to the offending node, not just its table's position):

```ts
portableTextToMarkdown(blocks, {
  onDegradation: ({degradations, message}) => console.log(message),
})
// degradations: every SerializeDegradation, in encounter order
// message: the same degradations grouped, snippeted, and sorted by block
```

Providing your own renderer for the affected construct suppresses its report: `onDegradation` only fires for fallbacks the library's own default renderers produced, never for a consumer's `unknownMark`, `unknownBlockStyle`, or `unknownListItem`. `list-item-fallback` never fires under the default configuration, since the default `listItem` renderer already covers every kind: it only fires behind a consumer-supplied partial `listItem` map.

`applyMarkdownEdit`'s `serialize` option doesn't accept `onDegradation`, since that serialization only ever runs internally to align `storedPortableText`, never on `editedMarkdown` itself.
