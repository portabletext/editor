---
'@portabletext/editor': minor
---

feat: add `containers` to editor context

`EditorContext.containers` (`@alpha`) is a `ReadonlyMap<string, RegisteredContainer>` of registered editable containers, keyed by bare `_type` (e.g. `'callout'`, `'table'`). Each value carries `{type, field, of?}` - the resolved child field plus any positional `of` registrations declared on the parent. The render callback is engine-internal and not surfaced on the public view, so consumers asking "is this type a container?", "what is its child field?", or "does this parent declare a positional override at this child type?" see the data they need without reach into render-time concerns. Public exports include `Container`, `RegisteredContainer`, `RegisteredLeaf`, and `Containers`.
