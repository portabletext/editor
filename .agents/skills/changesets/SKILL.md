---
name: changesets
description: How to write changesets in the Portable Text Editor monorepo. Use whenever adding a .changeset/*.md file or deciding whether a change needs one. Covers bump selection (patch/minor/none), the subject-mirrors-commit rule, consumer-facing prose style, and API changesets, with real exemplars from the repo history.
---

# Writing PTE changesets

## When and what bump

- **One changeset per user-facing change.** Filename is slug-style, describing the change (`get-sibling-map-fallback.md`, `catalog-cross-kind.md`), not the ticket/PR.
- `fix:` / user-visible refactor → **patch**. New API → **minor**.
- **No changeset** for: internal-only refactors, tests, CI/tooling, dependency regrouping with no resolved-version change.
- **New packages get no changeset**: v1.0.0 is hand-published from the branch before the PR merges (`plugin-typeahead-picker` precedent); changesets manage it from 1.0.0 on.
- Corollary: a commit that ships a changeset is `fix:`/`feat:` (see the `commits` skill).

## Shape

```
---
'@portabletext/editor': patch
---

<commit subject, verbatim, prefix and backticks included>

<blank line>

<1–2 paragraphs for the CONSUMER: present tense, observable behavior>
```

- First line repeats the commit subject **verbatim**. Since the frontmatter names the package, the commit subject (and thus this line) uses bare `fix:`/`feat:`, no scope.
- The prose is written for the consumer reading a changelog: what they observe, in present tense ("Backspacing through empty blocks ... no longer slows down"). Not the diagnosis, not test references, not PR numbers, not internal function archaeology, that lives in the commit body and PR description.
- **API changesets enumerate the exact exported names** and show a fenced usage example. Include a resolution-order list when the API has ordering semantics (see the `defineX` render-prop-types and `'*'` catch-all entries in `editor/CHANGELOG.md`).
- Call out the upgrade action explicitly when the change shifts something consumers iterate, switch over, or type against: "Code that iterates the map will see the new serialized-path keys", "exhaustive switches over `event.type` gain a case".
- Perf fixes state the numbers.
- Behavioral deltas that ride along are named explicitly ("One narrow behavioral fix rides along: ...").
- Small self-explanatory changes can be **subject-only**.

## Exemplars (real, from the repo history)

### patch: perf fix with numbers + a rides-along delta

```md
---
'@portabletext/editor': patch
---

fix(perf): resolve the `unset` selection fallback's nearest spans without a document scan

Backspacing through empty blocks, and any other edit that removes the node the selection sits in, no longer slows down with document size. Previously each such removal scanned the document from the start to find the nearest span; in large documents this made deleting empty lines feel sluggish (~267ms per backspace at 8,000 blocks, now ~20ms).

One narrow behavioral fix rides along: when the removed node was addressed by a numeric path, the fallback previously moved the selection to the document's first span; it now moves it to the actual nearest span.
```

Why it's good: observable symptom first ("backspacing ... no longer slows down"), numbers with context, and the semantic delta explicitly fenced off.

### minor: new API with enumerated name + example

````md
---
'@portabletext/editor': minor
---

feat: add `editor.dom.getPointAtCoordinates`

Pass viewport coordinates (for example a pointer event's `clientX`/`clientY`) and get back where a click at those coordinates would place the caret, as an editor selection point, or `null` when the coordinates don't hit the editor's content:

```ts
const point = editor.dom.getPointAtCoordinates({
  x: event.clientX,
  y: event.clientY,
})
// {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 3}
```
````

It's the counterpart of `editor.dom.getSelectionRect`: that one turns a selection into pixels, this one turns pixels back into a point. Behavior guards and actions get it on their `dom` argument.

````

Why it's good: the export is named, the example shows input AND output shape, and the
"counterpart of" framing places the API in the consumer's existing mental model.

### patch: behavior fix, consumer-observable framing

```md
---
'@portabletext/editor': patch
---

fix: resolve `getSibling` when `blockIndexMap` misses or disagrees with the tree

`getSibling` previously returned `undefined` for siblings the tree
plainly has when the anchor's path was absent from the block-index
map, and could return the wrong sibling when the map was stale. It now
verifies the mapped position against the tree and falls back to a
linear scan, matching `getNode` and `getChildren`. Paths addressing
the anchor by numeric index now resolve instead of returning
`undefined`.
````

Why it's good: states the wrong observable outputs (`undefined` where a sibling exists, wrong sibling), then the new contract, and anchors it to sibling APIs the consumer already trusts ("matching `getNode` and `getChildren`").

## Multi-PR release trains (stacks)

When a major lands as a stack of PRs feeding one Version Packages release, three extra rules apply; each was learned from a real incident during the v8 stack:

- **A changeset must be true of the release, not just its PR.** Before pushing, audit claims about untouched surface ("X stays", "remains exported but is deprecated", "Y keeps composing") against the other pending changesets: a sibling PR in the same train may remove exactly that surface, and the changelog would assert both. (The `remove-render-list-item` changeset promised `data-list-item`/`data-level` stay; the unified-DOM changeset removes them.)
- **Changesets are keyed to consumer-observable changes, not PRs.** A PR that completes a story an earlier pending changeset began amends that changeset instead of adding a sibling; pending changesets are ordinary files on `main` until released. (The props-shape-types PR added no changeset: `remove-render-style` absorbed `BlockStyleRenderProps`, since prop and types leaving together is one change to the consumer.)
- **Migration advice must name a reader you can point at.** If no consumer demonstrably uses the pattern the sentence addresses, delete the sentence; speculative hand-holding is noise wearing a helpful face. (An invented `Pick<BlockStyleRenderProps, ...>` consumer got a personalized migration note; nobody Picks from a callback-payload type.)

## Anti-patterns

- First line paraphrasing instead of mirroring the commit subject.
- Diagnosis prose ("the bug was in `updateBlock`'s reconcile...") — consumers don't care where it was, only what changed for them.
- Referencing tests, PR numbers, or issue-tracker tickets.
- A changeset for an internal refactor "just in case" — no observable change, no changeset.
- Bumping minor for a fix because it "feels big"; size ≠ semver.

## The canon

Past changesets are consumed on release; `packages/*/CHANGELOG.md` is where they accumulate. The `7.x` entries in `editor/CHANGELOG.md` are the reference set.
