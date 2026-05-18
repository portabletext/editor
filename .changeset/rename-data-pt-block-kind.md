---
'@portabletext/editor': minor
---

feat!: rename `data-pt-block-kind` to `data-pt-block`

The DOM attribute the engine writes on every block element renames from `data-pt-block-kind` to `data-pt-block`. The attribute's values stay the same (`text`, `object`, `container`). Consumers that target the engine namespace with CSS selectors or DOM queries should rename the attribute on the LHS:

```css
/* before */
[data-pt-block-kind='container'] { ... }
/* after */
[data-pt-block='container'] { ... }
```

```ts
// before
element.closest('[data-pt-block-kind]')
// after
element.closest('[data-pt-block]')
```

The engine's own DOM queries are routed through the new attribute. Container DOM is pure `data-pt-*` - no `data-slate-*` leakage from the underlying layer.
