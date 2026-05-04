---
'@portabletext/editor': patch
---

feat: add `containers` to editor context

`EditorContext.containers` (`@alpha`) is a `Map` of registered editable containers, keyed by scoped type name. Behaviors and operations that need to know "is this scope an editable container?" or "what is its child field?" can read this map directly. Public exports include `Container`, `ContainerDefinition`, `Containers`, and `ResolvedContainers`.
