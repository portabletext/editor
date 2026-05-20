---
'@portabletext/toolbar': major
---

feat!: `useToolbarSchema` returns the union schema and `useApplicableSchema` returns the applicable subset

Two complementary hooks for building UI on top of the editor's schema.

`useToolbarSchema` returns the union schema: every decorator, annotation, list, style, block object and inline object declared anywhere in the editor's schema graph (root + every registered container's sub-schema). Stable across selection moves; re-renders only when the schema graph or extension callbacks change.

This is a behavioral change. Previously `useToolbarSchema` returned the focus block's sub-schema, so buttons disappeared when the caret left a container that declared a given decorator or list. Consumers that relied on that shape to gate button visibility should switch to `useApplicableSchema` for the applicable subset.

`useApplicableSchema` returns the applicable subset for the current selection by subscribing to the `getApplicableSchema` selector from `@portabletext/editor/selectors`. Text-only categories (decorators, annotations, lists, styles) return the union across all selected text blocks - a name is applicable when at least one covered block declares it, matching the underlying operations' per-block-filter semantics. Insertion categories (block objects, inline objects) return the focus block's sub-schema, since insertion happens at one point. Selection on a void block returns empty text-only sets and the focus block's insertion sets. No selection returns empty sets.

Consumers compose them at render to gate button enabled state:

```tsx
const schema = useToolbarSchema({extendDecorator: ...})
const applicable = useApplicableSchema()

schema.decorators.map((d) => (
  <DecoratorButton schemaType={d} isDisabled={!applicable.decorators.has(d.name)} />
))
```

For non-toolbar UI (slash menus, command palettes, keyboard-shortcut hints, hover tooltips), import `getApplicableSchema` directly from `@portabletext/editor/selectors` and compose with `useEditorSelector`.
