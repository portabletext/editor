---
'@portabletext/editor': minor
---

feat: add `getApplicableSchema` selector

Returns the set of schema member names applicable at the current selection, grouped by category. Text-only categories (decorators, annotations, lists, styles) return the union across all selected text blocks - matching the underlying operations' per-block-filter semantics. Insertion categories (block objects, inline objects) return the focus block's sub-schema, since insertion happens at one point. Selection on a void block returns empty text-only sets and the focus block's insertion sets. No selection returns empty sets.

Useful for gating toolbar buttons, slash-command items, command palettes, keyboard-shortcut hints, and other selection-aware UIs. Pair with `getUnionSchema` to render UI whose static surface is the schema's full reachable graph and whose enabled state reflects the current selection.

The result is a fresh value on every call. `compareApplicableSchema` is exported alongside as a structural comparator suitable for the third argument of `useEditorSelector`.
