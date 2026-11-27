---
'@portabletext/editor': patch
---

fix: return a container addressed by index from `getContainer`

`getContainer` from `@portabletext/editor/traversal` now finds a registered container that has no `_key` and is addressed by its index, matching `getNode` and `getChildren`:

```ts
// value: [{_type: 'callout', content: [...]}], with `callout` registered as a container
getContainer(snapshot, [0])
// {node: {_type: 'callout', content: [...]}, path: [0]}
// Previously: undefined
```

A node without a `_key` inside a keyed container, such as `[{_key: 'c0'}, 'content', 0]`, is also no longer reported as a container because its parent is one.
