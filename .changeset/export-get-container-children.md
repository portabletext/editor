---
'@portabletext/editor': minor
---

feat: export `getContainerChildren` from `@portabletext/editor/traversal`

Adds `getContainerChildren` to `@portabletext/editor/traversal`. Given a
node (and optionally its resolved parent container), it returns
`{children, container}` when the node is a registered container and
`undefined` for anything that is not (text blocks, spans, leaves,
unregistered objects). `children` is the node's editable child array and
`container` is the node's own container registration: read
`container.field.name` for the path segment that reaches the children,
and thread `container` back in as the parent when descending into them.
It resolves in one step from a node already in hand, with no path
re-walk, so recursive descent over containers stays linear in nesting
depth.
