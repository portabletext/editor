---
'@portabletext/markdown': minor
---

feat: report where and why the round trip failed when `applyMarkdownEdit` skips key matching

When the stored value cannot survive its own serialize→parse round trip, the skipped `ReconciliationReport` now carries `mismatch`: a `type` (`'type-changed'`, `'text-changed'`, or `'block-count-changed'`), a `storedPath` to the node where the round trip first goes wrong, a readable `message`, and an optional `snippet` of the text that came back. A custom renderer that writes an inline object as `[[foo]]` reports:

```ts
{
  keyMatching: 'skipped',
  reason: 'round-trip-mismatch',
  mismatch: {
    type: 'text-changed',
    storedPath: [{_key: 'b2'}, 'children', {_key: 'w1'}],
    message:
      "The block's text came back different, starting at the `wikilink` inline object",
    snippet: '[[foo]]',
  },
  renamedKeys: [],
}
```

Unlike the other paths in the report, `storedPath` addresses the stored value you passed in, not the returned value. Match on `type`, not `message`: the message can change between releases.
