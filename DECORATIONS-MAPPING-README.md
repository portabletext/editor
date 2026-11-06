# Mapping decorations through committed changes

This branch is a local integration spike for a Portable Text Editor
maintainer review. It combines the change boundary from #3413 with the step
vocabulary proposed in #3208, then uses that seam to keep range decorations
and remote presence cursors attached to their original text.

## Problem

Range decorations were transformed one engine operation at a time. That loses
the identity of text when a user action is represented by several operations:
a block split removes a tail and inserts it elsewhere, a merge removes a
donor after folding its text into a recipient, and a paste or remote batch can
combine both with rekeys and block insertion/removal. A highlight could be
truncated, left on the wrong block, revived onto replacement text, or dropped
entirely. Remote cursors had the same structural-edit problem.

The important unit is the committed change, not an individual operation. At
that boundary both the before-value and the complete ordered transaction are
available, so removed and inserted text can be recognized as one move.

## Data flow

1. #3413 publishes a `Change` after an atomic local or remote transaction.
   Every entry carries its operation and `beforeValue`; the engine snapshot is
   the committed after-value.
2. `engineChangeCallback` in
   `packages/editor/src/editor/range-decorations-machine.ts` subscribes with
   `subscribeToChanges` and sends one `engine change` event to the existing
   range-decorations machine.
3. `mapDecorationRangesThroughChange` in
   `packages/editor/src/editor/map-decoration-ranges-through-change.ts`
   derives the transaction patches with the private `changeToPatches`
   adapter. It calls `interpretTransaction(before, patches)` exactly once.
4. `interpretTransaction` in
   `packages/steps/src/interpret-transaction.ts` replays the patches and
   emits primitive `insert.text`, `remove.text`, `move.text`, `remove.node`,
   `move.node`, `set.text`, `set.children`, and `set.key` steps. Final-state
   inference recognizes surviving descendants, insert-first moves, and
   unambiguous rekeys that are not visible from one patch alone.
5. The editor maps each affected decoration with `mapRange`. Cross-block
   backward ranges are ordered against the before-value, mapped in document
   order, then restored to their original direction. Collapsed ranges opt in
   to following either side of a text move, matching caret behavior.
6. `rangeSurvives` checks original character identity, while
   `normalizeRangeBoundary` keeps equivalent span-boundary representations
   stable across later changes. The decoration policy drops expanded ranges
   that collapse, reverse, lose all original text, or map to `null`.
7. The existing machine applies the result to prop decorations and registered
   decorations, preserving its `onMoved`/`onMapped`, death, revival, and
   controlled-source behavior. A touched-block prefilter bypasses mapping only
   when neither endpoint nor an interior block can be affected.

`changeToPatches` remains private because it depends on editor engine entries,
schema containers, and intermediate after-values. The reusable public seam is
`@portabletext/steps`: patches in, steps out, then `mapPoint`, `mapRange`, and
`rangeSurvives`.

## Decoration policy

- Typing at a highlight edge stays outside it; typing inside stretches it.
- Pasting inside a highlight stretches it around the inserted content.
- Replacing the highlight's complete original text retires it, even if the
  replacement has identical characters. In practical paste terms, a
  highlight dies only when all of its text was selected and replaced.
- Partial deletion preserves the surviving original characters.
- Split and merge tails follow their moved text when the interpreter has
  sufficient identity evidence.
- A dead registered decoration stays dead until its consumer deliberately
  supplies a different anchor/focus range; coincidental replacement text does
  not revive it.

## Remote cursors

Presence cursors use the same seam. `plugin-sdk-value` registers a collapsed
decoration, so a remote cursor is mapped by the same interpreted transaction
as a highlight rather than by a second structural-edit implementation.
Collapsed affinity makes a cursor follow a split tail or merge destination in
the same way as the editor's local selection. Prop-based presence decorations
also use this path; moving them in read-only viewers is B6 and is deliberately
planned as a separate PR.

## Changes from #3208

| ID  | #3208                                                                                            | This branch                                                                                  | Disposition                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| B1  | A point at the end of moved text follows with forward affinity and stays with backward affinity. | Move boundaries are side-aware: forward follows `from.start`; backward follows `from.end`.   | Keep. It prevents Enter at a highlight end from swallowing the break while allowing the split tail to follow. |
| B2  | Cross-path backward ranges are caller-normalized.                                                | The editor orders them using the before-value, maps them, then restores direction.           | Keep in the editor adapter; `mapRange` stays schema/document-free.                                            |
| B3  | Decoration death is outside the steps package.                                                   | The editor uses `rangeSurvives` and its replacement policy.                                  | Keep as editor policy.                                                                                        |
| B4  | A removed container invalidates surviving descendants except a recognized rename.                | Every uniquely keyed descendant that survives exactly once can move.                         | Keep; this covers multi-span merges.                                                                          |
| B5  | Pairing depends on delete-before-insert patch order.                                             | An insert-first move pairs when exactly one surviving destination satisfies the constraints. | Christian's call. This trades a narrow repeated-text ambiguity for order-independent remote splits.           |
| B6  | Read-only prop decorations do not move.                                                          | They move through remote changes like registered decorations.                                | Separate PR (`4e974f357`), with corrected history: the guard predates the extraction.                         |

Five #3208 expectations are overridden:

| Suite                                                           | Contract changed                                           |
| --------------------------------------------------------------- | ---------------------------------------------------------- |
| `step-mapper.test.ts`, point at `from.end`, forward             | Stays at the source end.                                   |
| `step-mapper.test.ts`, point at `from.end`, backward            | Follows to the destination end.                            |
| `map-range.test.ts`, range ending at the moved-text end         | Both boundaries follow the moved text.                     |
| `interpret-transaction.test.ts`, partial-collision merge        | Every uniquely keyed surviving descendant moves.           |
| `interpret-transaction.test.ts`, insert before matching removal | Pairs when one final surviving destination is unambiguous. |

## Performance

Chromium medians from three interleaved branch/base runs, after all 1,000
blocks and 1,000 prop decorations rendered:

| Workload                   |   Branch |       Base | Ratio |
| -------------------------- | -------: | ---------: | ----: |
| 50 text insertions         | 234.1 ms |   300.6 ms | 0.78x |
| 20 Enters                  | 243.1 ms |   361.0 ms | 0.67x |
| 10 full-range deletes      |  52.8 ms |    93.2 ms | 0.57x |
| 10 three-block pastes      | 381.2 ms | 1,451.4 ms | 0.26x |
| One 216-patch remote batch | 178.6 ms |   234.2 ms | 0.76x |

The remote batch contains 210 text insertions across distinct blocks plus a
split, merge, block insertion, and block removal in one change. Its 0.94x
0.76x ratio is below the 1.5x investigation threshold. Full run values and harness
details are in `/workspace/proposals/perf-report.md`.

## Known limits and follow-ups

- A one-character split tail does not follow. Move pairing deliberately
  requires at least two characters to avoid ambiguous coincidental matches;
  this is inherited from #3208.
- Undo/redo rebasing is a separate, substantially larger change. History
  currently stores forward engine operations and lazily adjusts them per
  remote patch, without split/merge lineage. The proposed follow-up stores
  text/node intents and eagerly maps them through each committed remote
  transaction. If a history entry loses all owned content, dropping it must
  continue the user's undo request with the next entry rather than clearing
  either history stack. Partial survival must preserve remote text embedded
  inside locally inserted content. See `/workspace/proposals/stage5-design.md`.
- B5 remains a product/design decision. If order-independent insert-first
  pairing is rejected, remote producers need a stronger identity hint or a
  canonical patch order.
- B6 is useful for viewer presence but independent of the transaction/steps
  design and should not be used to decide the main PR.

## Proposed PR split

1. **Steps PR:** #3208 plus the side-aware move rules, final-state inference,
   `normalizeRangeBoundary`, `rangeSurvives`, numeric-path isolation, and
   interpreter performance work.
2. **Editor PR:** the #3413 change subscription, patch adapter, decoration
   death/revival policy, document-order mapping, presence cursor integration,
   event-shape fix, tests, and editor performance prefilter.
3. **B6 PR:** read-only prop decoration movement (`4e974f357`) by itself.
4. Drop stage reports and diagnostics scaffolding; squash durable test renames,
   documentation, and doc-check plumbing into their owning PRs.

The commit-by-commit assignment, including every mixed-package commit that
must be split, is in `/workspace/proposals/pr-split.md`.
