# Step 0: decoration mapping at the change boundary

## Stack

This spike is based on `origin/feat/change-event` at `0adb20f90`, followed by
the steps commits `9ee894ab4` and `2e7030c9e`.

## Seam and input gap

`mapDecorationRangesThroughChange(editorEngine, change)` returns
`(range) => Range | null`. The range-decoration machine subscribes to
committed changes, keeps live ranges unchanged while a change is open, and
maps each range once at commit.

`changeToPatches(editorEngine, change)` derives patches from every operation
for both local and remote changes. For each operation it reconstructs the
after-value from the next entry’s `beforeValue`, or from the committed editor
snapshot for the final entry, then calls the existing `operationToPatches`.
This keeps both origins on one path and leaves one small replacement point for
a future operations-to-steps adapter.

`operationToPatches` has an explicit case for every engine operation:
`insert.text`, `remove.text`, `insert`, `set`, `unset`, and
`set.selection`. Selection intentionally yields no patches. Text operations
also yield no patch if their target span cannot be resolved or if the computed
text diff is empty; node insertion may add `setIfMissing` before `insert`.
There are no otherwise-unrepresented operation types.

Sampled local insert/remove/set changes produced the same ordered patches as
their own `entry.patches`. Remote entries carry no patches, so they
intentionally differ: derived patches contain the operation’s wire patches
while `entry.patches` is empty. Repair/correction entries can also differ
because an entry may carry resolution patches from its apply context; the
spike deliberately derives from operations uniformly instead of mixing the
two inputs.

## Results

Decoration suites: 109/138 passed. The two focused compatibility suites pass
fully (`spike-argus-v5-range-decorations` 4/4 and registration 33/33), as
does the adapted machine suite (26/26). The split/merge suite is 9/23 and the
broad range suite is 37/52. See
[`step0-failures.md`](/workspace/proposals/step0-failures.md) for every
failure and diagnosis.

The affected change-event suites pass 113/113 (106 browser, 7 unit), and the
steps package passes 104/104 unit tests. Editor and steps typechecks pass.

## Performance

Chromium, same container, three runs each, 1,000 blocks and 1,000 prop
decorations. Timed regions exclude initial rendering.

| Workload           |                       This branch (ms) |           Plain change-event base (ms) | Ratio |
| ------------------ | -------------------------------------: | -------------------------------------: | ----: |
| 50 text insertions |     348.1 median (348.1, 390.5, 336.9) |     301.6 median (307.7, 301.6, 292.2) | 1.15x |
| 20 Enters          | 1405.8 median (1385.5, 1789.2, 1405.8) | 1541.0 median (1541.0, 1610.3, 1494.0) | 0.91x |

## Open items

The remaining failures are inputs to the next step: structural patch pairing,
range death/revival semantics, and one imported controlled-null harness
incompatibility. No typing fast path was added. No prerequisite change-event
or steps implementation was modified.
