---
'@portabletext/markdown': minor
---

feat: add `onReconciliation` report to `applyMarkdownEdit`

`applyMarkdownEdit` can now report what it did with every key. A preserved key means "this node in the returned value wears its stored key". A renamed key means "this key was renamed to stay unique among siblings". A key fallback marks a place that got fresh keys instead of a guess. Concretely, for a stored value of two paragraphs around a custom object, where the edit fixes one typo:

```ts
import {applyMarkdownEdit} from '@portabletext/markdown'

// stored: [block b1 'Our pick:', product p1, block b2 'Ships tomorow.']
// edited markdown: the same document with 'tomorow' -> 'tomorrow'
applyMarkdownEdit(stored, editedMarkdown, {
  onReconciliation: (report) => {
    // report is:
    // {
    //   keyMatching: 'performed',
    //   preservedKeys: [
    //     {basis: 'content-unchanged', key: 'b1', path: [{_key: 'b1'}]},
    //     {basis: 'content-unchanged', key: 's1', path: [{_key: 'b1'}, 'children', {_key: 's1'}]},
    //     {basis: 'content-unchanged', key: 'p1', path: [{_key: 'p1'}]},
    //     {basis: 'same-position', key: 'b2', path: [{_key: 'b2'}]},
    //     {basis: 'same-position', key: 's2', path: [{_key: 'b2'}, 'children', {_key: 's2'}]},
    //   ],
    //   keyFallbacks: [],
    //   renamedKeys: [],
    // }
    // reading it: every stored key survived, at every depth. The
    // untouched nodes matched exactly ('content-unchanged'), the edited
    // paragraph kept its block and span keys the way typing over it
    // in an editor would ('same-position'). Other basis values name
    // the other matching methods: 'content-moved', 'content-split',
    // 'content-merged', 'similar-content'.
  },
})
```

What the other fields mean when they are not empty:

- `report.keyMatching === 'skipped'`: key matching did not run, and `report.reason` says why, `'round-trip-mismatch'` (the stored value cannot survive its own serialize→parse round trip) or `'document-too-large'`. The returned value is the plain conversion, every key fresh except the ones `json:object` payloads carry, and the report carries only `reason` and `renamedKeys`.
- `keyFallbacks: [{type: 'ambiguous-region-too-large', keys: [...]}]`: one ambiguous region was too large to gather evidence for, and the listed result blocks fell back to fresh keys. `{type: 'annotation-key-conflict', path}`: one annotation definition kept its fresh key because adopting the stored one would have collided with a sibling.
- `renamedKeys: [{previousKey: 'p1', key: 'k7', path}]`: a key was rewritten to keep siblings unique, most commonly a pasted `json:object` payload duplicating a key that already exists.

The callback fires exactly once whenever set, synchronously, right before the function returns, a skip included: that is when a caller needs it most. A node absent from `preservedKeys` was not preserved from the stored value, whether it is a fresh key or a `json:object` payload key that carried its own, and the report does not distinguish the two. Every `key` and `path` matches the returned value exactly (a path segment is a string field name, a number array index, or `{_key}` for a keyed element, the same convention as editor paths).

Which keys survived, every `key` and `path`, `renamedKeys`, and `keyMatching` are facts of that invocation, safe to branch on. A preserved key's `basis` is advisory: near the evidence caps it can vary with machine speed, so never branch on it. The two exported types, `ReconciliationReport` and `ReconciliationKeyPath`, are `@beta`.
