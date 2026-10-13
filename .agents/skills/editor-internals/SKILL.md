---
name: editor-internals
description: Find the right Behavior event or traversal util in `@portabletext/editor` and know how it behaves before relying on it. Use whenever writing or reviewing code that raises Behavior events, reads the value through `@portabletext/editor/traversal`, or touches `src/operations` or `src/behaviors`. Points to the docs for what exists and lists the behaviors the types do not show.
---

# Editor internals

## What exists

The docs are the catalogue. Read them before reaching for an event or a
util, and do not re-derive the list from source:

- Events: `apps/docs/src/content/docs/editor/reference/behavior-api.mdx`
  (native, synthetic and abstract event types, generated from
  `src/behaviors/behavior.types.event.ts`) and
  `apps/docs/src/content/docs/editor/concepts/behavior.mdx` (guards,
  actions, `raise`, `forward`, `execute`).
- Traversal: `apps/docs/src/content/docs/editor/reference/traversal.mdx`
  (lookups, family walkers, narrowing predicates, path and point
  utilities, schema resolution) and
  `apps/docs/src/content/docs/editor/concepts/traversal.mdx` (snapshots,
  paths, entries, points).
- Containers: `apps/docs/src/content/docs/editor/concepts/containers.mdx`.

The JSDoc on each exported function is the contract. Read it at the
definition before composing two utils.

## How an event reaches the value

Events come in two layers. Synthetic events (`delete`, `insert.block`,
`set`, `unset`, `select`, ...) each have an operation implementation in
`src/operations/operation.<type>.ts`, registered in
`src/operations/operation.perform.ts`. Abstract events (`delete.block`,
`delete.backward`, `move.block`, `split`, `style.toggle`, ...) have no
operation: a behavior in `src/behaviors/behavior.abstract.<area>.ts`
rewrites them into synthetic events.

So the code that decides what an abstract event does is two hops away.
Before relying on an abstract event, read its abstract behavior and then
the operation it raises. A fix to an abstract event usually lands in the
operation, and then it changes every other event that raises the same
operation.

## Behaviors the types do not show

- `getNode` resolves a path to the deepest node it reaches and strips
  trailing field segments, so `entry.path` can be shorter than the input
  path (`24996df6b`). Act on `entry.path`, never on the input path, once
  you have looked a node up.
- `isBlock` is true for any node whose parent is not a text block, so
  text blocks inside a container are blocks too (`041fef01c`). A block
  check does not tell you a node is top level.
- Resolving a selection point that sits on a container, rather than on a
  span or a leaf object, descends to the container's first or last leaf
  (`resolveSelectionPoint` in `src/internal-utils/apply-selection.ts`).
  An operation that resolves `at` before acting no longer sees the
  container path.
- `unsetMatchedNodesInRange` keeps only the deepest match on each branch
  (`1ac7dc3d9`). When a container and the blocks inside it both match,
  only the inner blocks are unset and the container stays.

## Containers

Containers nest blocks inside block objects, so any code that walks the
value, compares paths or assumes blocks are top level has a container
case. Exercise it in tests with a `defineContainer` registered through
`NodePlugin`, as `tests/cross-container-range-delete.test.tsx` does.

## Keeping this skill current

Add a bullet here when a bug or a review turns up a behavior the types
and the JSDoc do not show. Cite the commit that pins it, and delete the
bullet when the behavior changes.
