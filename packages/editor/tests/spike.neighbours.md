# Q3 and Q4 history probes

The earlier work is retained. These additions change no file in `packages/steps` and add no step field. Enable the test-only adapter and added measurements with `HISTORY_NEIGHBOURS=1`. Use `HISTORY_BASELINE=1` to run the added assertions against unchanged proposal (d); ordinary test runs leave these experiment-only cases disabled. Q4 disables the neighbour adapter and uses proposal (d)'s positions for both policies.

`|` separates sibling block texts inside the tested array, including inside a callout or table cell. Every table entry below is an exact string asserted by the browser tests.

## Q3

Both requested rows lose **0** of the 85 contracts: **85/85 pass**. The six row/depth cases pass. Row 1 also asserts keyed sibling order because the collaborator block and restored block both contain `foo`. Its restored block follows the collaborator block and precedes the surviving `bar`.

| Row                      | Depth      | Policy     | Before          | After edit      | After collaborator | After undo           | After redo      |
| ------------------------ | ---------- | ---------- | --------------- | --------------- | ------------------ | -------------------- | --------------- |
| Q3 insert before removed | root       | neighbours | `foo\|bar\|baz` | `bar\|baz`      | `foo\|bar\|baz`    | `foo\|foo\|bar\|baz` | `foo\|bar\|baz` |
| Q3 move anchor removed   | root       | neighbours | `foo\|bar\|baz` | `foo\|baz\|bar` | `baz\|bar`         | `bar\|baz`           | `baz\|bar`      |
| Q3 insert before removed | callout    | neighbours | `foo\|bar\|baz` | `bar\|baz`      | `foo\|bar\|baz`    | `foo\|foo\|bar\|baz` | `foo\|bar\|baz` |
| Q3 move anchor removed   | callout    | neighbours | `foo\|bar\|baz` | `foo\|baz\|bar` | `baz\|bar`         | `bar\|baz`           | `baz\|bar`      |
| Q3 insert before removed | table cell | neighbours | `foo\|bar\|baz` | `bar\|baz`      | `foo\|bar\|baz`    | `foo\|foo\|bar\|baz` | `foo\|bar\|baz` |
| Q3 move anchor removed   | table cell | neighbours | `foo\|bar\|baz` | `foo\|baz\|bar` | `baz\|bar`         | `bar\|baz`           | `baz\|bar`      |

## Q4

The live-node policy keeps `x` in all six edit/depth cases, after both undo and redo. The saved-copy policy loses it in all six. For an edited inserted block, live-node undo deliberately leaves the whole block in place; redo detects the existing key and does not duplicate or overwrite it. For moves, each replay captures the live node before removal and inserts that captured node at the opposite position.

| Row              | Depth      | Policy | Before          | After edit           | After collaborator    | After undo            | After redo            |
| ---------------- | ---------- | ------ | --------------- | -------------------- | --------------------- | --------------------- | --------------------- |
| Q4 move edited   | root       | live   | `foo\|bar\|baz` | `foo\|baz\|bar`      | `foo\|baz\|barx`      | `foo\|barx\|baz`      | `foo\|baz\|barx`      |
| Q4 move edited   | root       | saved  | `foo\|bar\|baz` | `foo\|baz\|bar`      | `foo\|baz\|barx`      | `foo\|bar\|baz`       | `foo\|baz\|bar`       |
| Q4 insert edited | root       | live   | `foo\|bar\|baz` | `foo\|foo\|bar\|baz` | `foo\|foox\|bar\|baz` | `foo\|foox\|bar\|baz` | `foo\|foox\|bar\|baz` |
| Q4 insert edited | root       | saved  | `foo\|bar\|baz` | `foo\|foo\|bar\|baz` | `foo\|foox\|bar\|baz` | `foo\|bar\|baz`       | `foo\|foo\|bar\|baz`  |
| Q4 move edited   | callout    | live   | `foo\|bar\|baz` | `foo\|baz\|bar`      | `foo\|baz\|barx`      | `foo\|barx\|baz`      | `foo\|baz\|barx`      |
| Q4 move edited   | callout    | saved  | `foo\|bar\|baz` | `foo\|baz\|bar`      | `foo\|baz\|barx`      | `foo\|bar\|baz`       | `foo\|baz\|bar`       |
| Q4 insert edited | callout    | live   | `foo\|bar\|baz` | `foo\|foo\|bar\|baz` | `foo\|foox\|bar\|baz` | `foo\|foox\|bar\|baz` | `foo\|foox\|bar\|baz` |
| Q4 insert edited | callout    | saved  | `foo\|bar\|baz` | `foo\|foo\|bar\|baz` | `foo\|foox\|bar\|baz` | `foo\|bar\|baz`       | `foo\|foo\|bar\|baz`  |
| Q4 move edited   | table cell | live   | `foo\|bar\|baz` | `foo\|baz\|bar`      | `foo\|baz\|barx`      | `foo\|barx\|baz`      | `foo\|baz\|barx`      |
| Q4 move edited   | table cell | saved  | `foo\|bar\|baz` | `foo\|baz\|bar`      | `foo\|baz\|barx`      | `foo\|bar\|baz`       | `foo\|baz\|bar`       |
| Q4 insert edited | table cell | live   | `foo\|bar\|baz` | `foo\|foo\|bar\|baz` | `foo\|foox\|bar\|baz` | `foo\|foox\|bar\|baz` | `foo\|foox\|bar\|baz` |
| Q4 insert edited | table cell | saved  | `foo\|bar\|baz` | `foo\|foo\|bar\|baz` | `foo\|foox\|bar\|baz` | `foo\|bar\|baz`       | `foo\|foo\|bar\|baz`  |

## Position mapping cost

**Yes: Q3 maps positions inside history. It is a second mapper next to steps.** Storing keyed neighbours avoids stale numeric indexes, but does not eliminate mapping policy.

New computations from steps, all in `updateGap` in `spike.neighbours.setup.ts`:

- Compare each `remove.node.path` with a saved gap's parent and neighbour key to decide which saved anchor was removed.
- Truncate `remove.node.nearest.path` to the sibling at that gap's depth and replace the removed neighbour key. Process later removal steps against the replacement too.
- Interpret `nearest.offset` (start versus end) to choose whether replay inserts before or after that surviving neighbour. This is history's own translation from a caret destination to a node gap, and counts against the design.

The rebase adapter temporarily shields insertion anchors from the existing point mapper with an artificial path, then restores their original paths. Otherwise the existing rebaser would drop an insertion when its old anchor disappeared. This is additional history-specific routing, although it does not calculate a moved coordinate.

`gapAt` reads neighbours from the live pre-operation value. Replay resolves saved neighbour keys against the live value and falls back to the other surviving neighbour. These are live key lookups, not computations of movement from patches. No new code reads patch payloads to infer movement. The requested spike does not establish general gap mapping across ancestor moves or ambiguous keys.

Proposal (d)'s existing history mapper remains: `rebaseStack`/`transformSequence` walk undo/redo operations and carry remote steps through the virtual replay; `mapOperation` delegates points/ranges to steps and splits removals at moved-text boundaries; `carryStep` maps remote coordinates through local replay and suppresses changes inside a replayed removal; `transformInterval` computes interval splits, offsets, lengths, overlap removal and boundary affinity. These remain history-side transformation responsibilities. `restoreInverse` rebuilds inverse operation data; it does not independently compute coordinates.

Q4's live-node alternative reads the source node from the live keyed path. It recognizes a move by matching the keys of an unset/insert pair within the history item. It does not infer a source coordinate from remote patches or add a step field. The saved-copy alternative retains today's replay behavior.

## Verification

- Dependency build: `pnpm --filter '@portabletext/editor...' build` passed.
- Editor type checks and targeted lint/format checks passed.
- Existing `transform-operation` unit suite: 16/16 passed. Ordinary, non-experiment structural probe run: 6/6 passed.
- Additional unchanged `steps` unit run: 1,114 passed, 35 failed, all failures in `interpret-change.test.ts`. Those assertions still expect the earlier `undefined` result, while the earlier work already changed interpretation to return conservative replacement steps (or an empty list for invalid empty inputs). No `steps` files were changed for this task.
- Final focused run: 109/109 passed (85 contracts, six prior structural probes, six Q3 cases, twelve Q4 policy cases).
- Broad neighbour-enabled run: 1,000 passed, three expected failures, one failure, across 16 files / 1,004 tests. Of the existing suites alone: 891 passed, three expected failures, one failure.
- The failing existing test is `remote-patches.non-object.test.tsx`: `undo after a remote removal reverts only the local edit`. It also fails with the prototype disabled. The broad run is therefore not entirely green; there is no additional observed existing-suite failure from this prototype.
- A prototype-disabled run proves all six Q3 cases and all six Q4 live-node cases fail without these additions. All six Q4 saved-copy comparisons pass there. The same pre-existing remote-patch test fails too.

Existing suites exercised: `event.history.undo`, `event.history.redo`, `undo-redo-collaboration`, `undo-merge-blocks`, `history.preserving-keys`, `no-op-history-skip`, `collaborative-editing`, `selection-after-remote-patches`, `remote-patches.cosmetic-normalization`, `remote-patches.non-object`, `event.patch`, `event.patches`, `event.patches.sidecar-arrays`, and `patch-path-rules`.

Reproduce the focused run:

```sh
HISTORY_NEIGHBOURS=1 pnpm --filter @portabletext/editor test:browser:chromium spike.positions spike.contract
```

This environment used Node 24.22.1 and its provisioned Chromium 131 via `HISTORY_CHROMIUM=/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell`. The default Playwright browser download was unavailable. Vitest's missing optional `@opentelemetry/api` dependency was installed outside the repository and linked in the dependency store; no package manifest or lockfile was changed for it.
