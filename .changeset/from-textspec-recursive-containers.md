---
'@portabletext/editor': patch
---

fix: resolve container scopes recursively when parsing textspec into portable text

Tests using `@portabletext/editor/test/vitest` step definitions to drive scenarios with self-referential containers (e.g. lists nested inside list-items nested inside lists) can now express any nesting depth. Previously, the textspec → portable text parser used exact-key lookups against the schema resolver's bounded candidate set, so containers nested deeper than two levels fell through to void block-objects.
