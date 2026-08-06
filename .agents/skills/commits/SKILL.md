---
name: commits
description: How to write commit messages in the Portable Text Editor monorepo. Use whenever committing here. Covers subject conventions, the dense mechanism-first body shape, commit-type selection (including the changeset⇒fix/feat rule), splitting, and fixup discipline, with real exemplars from the repo history.
---

# Writing PTE commits

## Subject

- Conventional, lowercase, imperative: `fix:`, `feat:`, `refactor:`, `test:`, `chore:`, `docs:`.
- Scope when package-specific (`fix(sanity-bridge):`, `chore(deps):`), **but**: when the commit ships a changeset, the changeset frontmatter already names the package, so the scope is redundant, use bare `fix:` / `feat:`.
- The subject names the **actual mechanism or contract**, never vague intent:
  - ✅ `fix: return a path that identifies the node from getNode`
  - ✅ `fix: only rewrite the DOM selection when it disagrees with the model`
  - ❌ `fix: getNode path bug`, ❌ `fix: improve selection handling`
- Backticks around code identifiers in subject and body.
- **Never reference Linear ticket IDs** in subjects, bodies, or branch names. Branches are named after the change (`fix-inline-object-drag-selection`), not the ticket.

## Type selection

- A commit that ships a **changeset is `fix:` or `feat:`**, never `refactor:`/`chore:`. The changeset is the tell: releasable change ⇒ fix/feat.
- `chore(deps):` for dependency/config work with no published-code change (no changeset).
- Renovate-adjacent nuance: `fix(deps)` cuts a patch release via the changeset bot; don't hand it to tooling-only bumps.

## Body

Dense technical prose, wrapped at ~72 columns, structured as:

1. **Old mechanism and why it was wrong**, with the precise failure sequence, name the functions, the inputs, and what the wrong output was.
2. **The new mechanism.**
3. **Explicitly scoped behavioral deltas**: "Net behavior unchanged", "Emitted patches only change in the narrow case of...", "One narrow behavioral fix rides along: ...".

Trivial commits get **no body**. One logical change per commit: tests pinning a contract get their own `test:` commit; refactors are split from fixes.

Once a PR is **in review**, follow-ups are `fixup!` commits (`git commit --fixup <sha>`), squashed with `git rebase -i --autosquash` before merge. Before review, fold changes into the logical commit they belong to. Merge-time history is clean logical commits, never a trail of "address review feedback".

## Exemplars (real, from the repo)

### fix with a lying-contract framing (`24996df6b`)

```
fix: return a path that identifies the node from `getNode`

`getNode(snapshot, path)` follows a path through the editor value and
returns the deepest node it reaches. When the input path ended on a
field-name string — e.g. `[{_key: 'image1'}, 'caption']` pointing
into a block object's primitive field — the walker still resolved to
the block but returned the input path verbatim, including the
trailing field name. The contract was lying: `entry.path` didn't
identify `entry.node`, and downstream composition (`isBlock(entry.path)`,
`getEnclosingBlock(entry.path)`) misclassified the entry because it
saw the field-suffixed path instead of the node's path.

Strip trailing field-name segments from the returned path. `getNode`
now returns a path that identifies the node it found: feeding
`entry.path` back into `getNode` resolves to the same node.

Includes test coverage for block-object, span, and inline-object
paths with trailing primitive fields, and a round-trip assertion.
```

Why it's good: names the function and its contract, gives a concrete input, states the downstream blast radius, then the fix as an invariant ("feeding `entry.path` back...").

### fix with a precise failure sequence + scoped delta (`46593d537`)

```
fix: write a `text`-named field on an inline object during value sync

When the editor received an updated value, `updateBlock`'s child
reconcile stripped `text` from every changed child before
`setNodeProperties`, then re-applied it only for spans via an
`insert.text` operation. On an inline object `text` is an ordinary
field, so it was stripped but never written back: the field's new
value silently never reached the editor, even though the incoming
value carried it. A field by any other name (`caption`, etc.) synced
fine because only `text` was special-cased.

Strip `text` only when the child is a span (spans own their text via
text operations); on a non-span child `text` flows through
`setNodeProperties` like any other property.

Net behavior unchanged for spans and for inline objects without a
`text` field.
```

Why it's good: the failure sequence is step-by-step (stripped → re-applied only for spans → never written back), includes the discriminating observation ("a field by any other name synced fine"), and closes with the exact blast-radius scoping.

### fix where the "why the old code was wrong" is subtle (`f2420072a`)

```
fix: only rewrite the DOM selection when it disagrees with the model

`validateSelection` compared the model's canonical DOM range against the
live DOM range by `startOffset`/`endOffset` alone, ignoring the
containers. A browser representing the same selection with element-level
endpoints (as browsers do when a selection sweeps across table cells) was
misread as out of sync, and the "fix" (`removeAllRanges` + `addRange`)
reset the in-progress native drag, collapsing the selection, and
destroyed backwardness (a `Range` carries no direction).

The validator now maps the live DOM selection back through
`toEditorSelection` and compares editor selections: equivalent
representations are left alone, and the DOM is only rewritten when the
two genuinely disagree about meaning. Passing the `DOMSelection` (not
`getRangeAt(0)`) also routes Firefox's multi-range table selections
through the engine's existing compat. Pinned by a test expressing the
same selection with element-level endpoints and asserting it survives
validation (red on the old comparison), plus one pinning that genuine
desyncs are still rewritten.
```

Why it's good: explains why the naive comparison was wrong (equivalent representations), names each consequence of the false positive, and points at both tests, the one that falsifies the old behavior and the one pinning the still-wanted behavior.

## Anti-patterns

- Subject naming the symptom or the ticket ("fix drag bug", "EDEX-1301").
- Bodies that restate the diff ("changed X to Y") without the failure sequence.
- Mixing a refactor into a fix commit, or tests into either.
- `refactor:`/`chore:` on a commit that carries a changeset.
- "Address review feedback" commits surviving to merge.
