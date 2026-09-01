---
'@portabletext/test': minor
---

feat: add `fromTextspec`, `toTextspec`, and `selectionFromTextspec`

Write test seeds and assertions as textspec notation instead of block literals. `fromTextspec` parses notation into Portable Text blocks and a selection, deterministic under the supplied key generator:

```ts
const {blocks, selection} = fromTextspec(
  {schema: compiledSchema, keyGenerator: createTestKeyGenerator()},
  'B: foo [strong:bar] b|az',
)
// blocks: one text block with spans 'foo ', 'bar' (strong), ' baz'
// selection: collapsed after the 'b' in ' baz'
```

`toTextspec` is the inverse: it serializes blocks and a selection back to one notation string, so an editor state can be asserted in a single `toEqual`. `selectionFromTextspec` resolves a pattern's selection markers (`|` caret, `^...|` range) against an existing value, for placing a selection in an editor that already has content.

Both directions take an optional `containers` map to resolve container schemas. The supporting types (`TextspecContainers`, `TextspecContainerRegistration`, `TextspecSelection`, `TextspecSelectionPoint`) are exported; the editor's own `Containers` and `EditorSelection` satisfy them structurally.
