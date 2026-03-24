---
"@portabletext/editor": minor
---

feat: internal Portable Text-native node traversal

Replaces the vendored Slate traversal system with schema-driven functions that resolve children on any node type, not just `.children`. The old system hardcoded `.children` as the only child field, which blocks first-class nesting where children will live in schema-defined fields like `rows`, `cells`, or `content`.
