---
'@portabletext/editor': minor
---

feat: fast-reject container lookups when the type is not a registered container

`lookupContainer` now consults a new `containerTypes: ReadonlySet<string>` sibling on `EditorContext` and returns `undefined` without scope-walking when the candidate type isn't registered as a container anywhere. Most calls during a tree descent hit non-container types (spans, text blocks, leaves), so the new set short-circuits them in O(1) instead of falling through to scope matching.

`containerTypes` is exposed as `@alpha` alongside `containers`. The set is rebuilt from the parsed scopes whenever containers are (re)resolved.
